import AppKit
import Carbon.HIToolbox
import CoreGraphics
import WebKit

private enum PaletteConstants {
    static let width: CGFloat = 680
    static let height: CGFloat = 430
    static let hotKeySignature: OSType = 0x464D4A49 // FMJI
    static let hotKeyIdentifier: UInt32 = 1
    static let pasteKeyCode: CGKeyCode = 9
}

private final class PalettePanel: NSPanel {
    override var canBecomeKey: Bool { true }
    override var canBecomeMain: Bool { false }
}

private final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    private var panel: PalettePanel?
    private var webView: WKWebView?
    private var hotKey: EventHotKeyRef?
    private var hotKeyHandler: EventHandlerRef?
    private var allowedDocumentURL: URL?
    private var rendererSchemeHandler: RendererSchemeHandler?
    private var rendererReady = false
    private var wantsPaletteVisible = false

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.accessory)
        createPalette()

        if !registerGlobalHotKey() {
            presentShortcutRegistrationError()
        }

        if ProcessInfo.processInfo.environment["FETCHMOJI_SHOW_ON_LAUNCH"] == "1" {
            showPalette()
        }
    }

    func applicationWillTerminate(_ notification: Notification) {
        if let hotKey { UnregisterEventHotKey(hotKey) }
        if let hotKeyHandler { RemoveEventHandler(hotKeyHandler) }
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard message.name == "fetchmoji",
              let payload = message.body as? [String: Any],
              let action = payload["action"] as? String else {
            return
        }

        switch action {
        case "insertEmoji":
            guard let requestID = payload["requestId"] as? String,
                  let emoji = payload["emoji"] as? String,
                  EmojiSelection.isValid(emoji) else {
                if let requestID = payload["requestId"] as? String {
                    resolveRequest(
                        requestID,
                        mode: "copied",
                        message: "The renderer sent an invalid emoji selection"
                    )
                }
                return
            }
            insertEmoji(emoji, requestID: requestID)
        case "dismiss":
            dismissPalette()
        default:
            break
        }
    }

    private func createPalette() {
        let contentController = WKUserContentController()
        contentController.add(self, name: "fetchmoji")
        contentController.addUserScript(
            WKUserScript(
                source: Self.hostBridgeScript,
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
        )

        let configuration = WKWebViewConfiguration()
        configuration.userContentController = contentController
        configuration.websiteDataStore = .nonPersistent()
        if let rendererRootURL = rendererRootURL() {
            let handler = RendererSchemeHandler(
                rootURL: rendererRootURL
            )
            configuration.setURLSchemeHandler(
                handler,
                forURLScheme: RendererAssetStore.scheme
            )
            rendererSchemeHandler = handler
        }

        let webView = WKWebView(
            frame: NSRect(x: 0, y: 0, width: PaletteConstants.width, height: PaletteConstants.height),
            configuration: configuration
        )
        webView.navigationDelegate = self
        webView.setValue(false, forKey: "drawsBackground")

        let panel = PalettePanel(
            contentRect: webView.frame,
            styleMask: [.borderless, .nonactivatingPanel],
            backing: .buffered,
            defer: false
        )
        panel.contentView = webView
        panel.level = .floating
        panel.isFloatingPanel = true
        panel.hidesOnDeactivate = false
        panel.isOpaque = false
        panel.backgroundColor = .clear
        panel.hasShadow = true
        panel.collectionBehavior = [
            .canJoinAllSpaces,
            .fullScreenAuxiliary,
            .transient,
            .ignoresCycle,
        ]
        panel.isMovableByWindowBackground = false
        panel.contentView?.wantsLayer = true
        panel.contentView?.layer?.cornerRadius = 15
        panel.contentView?.layer?.masksToBounds = true

        self.panel = panel
        self.webView = webView
        loadRenderer(in: webView)
    }

    private func loadRenderer(in webView: WKWebView) {
        if let developmentURL = ProcessInfo.processInfo.environment["FETCHMOJI_DESKTOP_UI_URL"],
           let url = URL(string: developmentURL) {
            allowedDocumentURL = url
            webView.load(URLRequest(url: url))
            return
        }

        guard rendererSchemeHandler != nil,
              let indexURL = URL(
                string: "fetchmoji://app/index.html"
              ) else {
            webView.loadHTMLString(Self.missingRendererHTML, baseURL: nil)
            return
        }

        allowedDocumentURL = indexURL
        webView.load(URLRequest(url: indexURL))
    }

    private func rendererRootURL() -> URL? {
        let bundledRoot = Bundle.main.resourceURL?
            .appendingPathComponent("desktop-ui", isDirectory: true)

        let sourceRoot = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        let sourceRendererRoot = sourceRoot
            .deletingLastPathComponent()
            .appendingPathComponent("desktop-ui/dist", isDirectory: true)
            .standardizedFileURL

        return [bundledRoot, sourceRendererRoot]
            .compactMap { $0 }
            .first { root in
                FileManager.default.fileExists(
                    atPath: root
                        .appendingPathComponent("index.html")
                        .path
                )
            }
    }

    @MainActor
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping @MainActor @Sendable (WKNavigationActionPolicy) -> Void
    ) {
        guard navigationAction.targetFrame?.isMainFrame == true,
              let requestedURL = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }

        let isAllowed: Bool
        if requestedURL.isFileURL {
            isAllowed = requestedURL.standardizedFileURL == allowedDocumentURL
        } else {
            isAllowed = requestedURL == allowedDocumentURL || requestedURL.scheme == "about"
        }
        decisionHandler(isAllowed ? .allow : .cancel)
    }

    func webView(
        _ webView: WKWebView,
        didFinish navigation: WKNavigation!
    ) {
        rendererReady = true
        if wantsPaletteVisible {
            revealPalette()
        }
    }

    private func registerGlobalHotKey() -> Bool {
        var eventType = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        let context = UnsafeMutableRawPointer(Unmanaged.passUnretained(self).toOpaque())
        let handlerStatus = InstallEventHandler(
            GetApplicationEventTarget(),
            { _, _, context in
                guard let context else { return OSStatus(eventNotHandledErr) }
                let delegate = Unmanaged<AppDelegate>.fromOpaque(context).takeUnretainedValue()
                DispatchQueue.main.async { delegate.togglePalette() }
                return noErr
            },
            1,
            &eventType,
            context,
            &hotKeyHandler
        )

        guard handlerStatus == noErr else { return false }

        let hotKeyID = EventHotKeyID(
            signature: PaletteConstants.hotKeySignature,
            id: PaletteConstants.hotKeyIdentifier
        )
        let registrationStatus = RegisterEventHotKey(
            UInt32(kVK_ANSI_Period),
            UInt32(controlKey | cmdKey),
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKey
        )
        return registrationStatus == noErr
    }

    private func togglePalette() {
        if panel?.isVisible == true || wantsPaletteVisible {
            dismissPalette()
        } else {
            showPalette()
        }
    }

    private func showPalette() {
        wantsPaletteVisible = true
        guard rendererReady else { return }
        revealPalette()
    }

    private func revealPalette() {
        guard let panel else { return }
        position(panel)
        panel.orderFrontRegardless()
        panel.makeKey()
        webView?.evaluateJavaScript(
            "window.dispatchEvent(new CustomEvent('fetchmoji:open'))"
        )
    }

    private func dismissPalette() {
        wantsPaletteVisible = false
        panel?.orderOut(nil)
    }

    private func position(_ panel: NSPanel) {
        let mouseLocation = NSEvent.mouseLocation
        let screen = NSScreen.screens.first { $0.frame.contains(mouseLocation) } ?? NSScreen.main
        guard let visibleFrame = screen?.visibleFrame else { return }

        let origin = NSPoint(
            x: visibleFrame.midX - PaletteConstants.width / 2,
            y: visibleFrame.midY - PaletteConstants.height / 2 + 72
        )
        panel.setFrameOrigin(origin)
    }

    private func insertEmoji(_ emoji: String, requestID: String) {
        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setString(emoji, forType: .string)
        dismissPalette()

        let hasAccess = CGPreflightPostEventAccess() || CGRequestPostEventAccess()
        guard hasAccess else {
            resolveRequest(
                requestID,
                mode: "copied",
                message: "\(emoji) copied — allow Accessibility access to paste automatically"
            )
            return
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) { [weak self] in
            let pasted = self?.postPasteShortcut() == true
            self?.resolveRequest(
                requestID,
                mode: pasted ? "pasted" : "copied",
                message: pasted
                    ? "\(emoji) inserted"
                    : "\(emoji) copied — automatic paste was unavailable"
            )
        }
    }

    private func postPasteShortcut() -> Bool {
        guard let keyDown = CGEvent(
            keyboardEventSource: nil,
            virtualKey: PaletteConstants.pasteKeyCode,
            keyDown: true
        ), let keyUp = CGEvent(
            keyboardEventSource: nil,
            virtualKey: PaletteConstants.pasteKeyCode,
            keyDown: false
        ) else {
            return false
        }

        keyDown.flags = .maskCommand
        keyUp.flags = .maskCommand
        keyDown.post(tap: .cghidEventTap)
        keyUp.post(tap: .cghidEventTap)
        return true
    }

    private func resolveRequest(_ requestID: String, mode: String, message: String) {
        let response: [String: String] = ["mode": mode, "message": message]
        guard let requestData = try? JSONSerialization.data(withJSONObject: requestID),
              let responseData = try? JSONSerialization.data(withJSONObject: response),
              let requestJSON = String(data: requestData, encoding: .utf8),
              let responseJSON = String(data: responseData, encoding: .utf8) else {
            return
        }

        webView?.evaluateJavaScript("window.__fetchmojiResolve(\(requestJSON), \(responseJSON))")
    }

    private func presentShortcutRegistrationError() {
        let alert = NSAlert()
        alert.messageText = "FetchMoji could not register ⌃⌘."
        alert.informativeText = "Another app may already own that global shortcut. Quit the conflicting app and relaunch this prototype."
        alert.alertStyle = .warning
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }

    private static let hostBridgeScript = #"""
    (() => {
      const pending = new Map();
      window.__fetchmojiResolve = (requestId, result) => {
        const resolve = pending.get(requestId);
        if (!resolve) return;
        pending.delete(requestId);
        resolve(result);
      };
      window.fetchmojiHost = {
        insertEmoji(emoji) {
          return new Promise((resolve) => {
            const requestId = crypto.randomUUID();
            pending.set(requestId, resolve);
            window.webkit.messageHandlers.fetchmoji.postMessage({
              action: "insertEmoji",
              requestId,
              emoji,
            });
          });
        },
        async dismiss() {
          window.webkit.messageHandlers.fetchmoji.postMessage({ action: "dismiss" });
        },
      };
    })();
    """#

    private static let missingRendererHTML = #"""
    <!doctype html>
    <html lang="en">
      <meta charset="utf-8">
      <meta name="color-scheme" content="light dark">
      <body style="font: 15px -apple-system; padding: 28px;">
        <h1 style="font-size: 20px;">Build the shared renderer first</h1>
        <p>Run <code>pnpm install --ignore-workspace && pnpm build</code> in <code>apps/desktop-ui</code>, then relaunch.</p>
      </body>
    </html>
    """#
}

let application = NSApplication.shared
private let delegate = AppDelegate()
application.delegate = delegate
application.run()
