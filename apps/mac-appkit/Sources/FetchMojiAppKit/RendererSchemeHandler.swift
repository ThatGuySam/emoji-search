import Foundation
import WebKit

struct RendererAssetStore {
    static let scheme = "fetchmoji"
    static let host = "app"

    let rootURL: URL

    init(rootURL: URL) {
        self.rootURL = rootURL.standardizedFileURL
    }

    func assetURL(for requestURL: URL) -> URL? {
        guard requestURL.scheme == Self.scheme,
              requestURL.host == Self.host else {
            return nil
        }

        let relativePath = requestURL.path == "/"
            ? "index.html"
            : String(requestURL.path.drop(while: { $0 == "/" }))
        guard !relativePath.isEmpty else { return nil }

        let candidate = rootURL
            .appendingPathComponent(relativePath)
            .standardizedFileURL
        let rootPath = rootURL.path
        let candidatePath = candidate.path

        guard candidatePath.hasPrefix(rootPath + "/") else {
            return nil
        }

        return candidate
    }

    static func mimeType(for fileURL: URL) -> String {
        switch fileURL.pathExtension.lowercased() {
        case "html": "text/html"
        case "js", "mjs": "application/javascript"
        case "css": "text/css"
        case "json", "map": "application/json"
        case "svg": "image/svg+xml"
        case "png": "image/png"
        case "jpg", "jpeg": "image/jpeg"
        case "webp": "image/webp"
        case "wasm": "application/wasm"
        default: "application/octet-stream"
        }
    }
}

final class RendererSchemeHandler: NSObject, WKURLSchemeHandler {
    private let store: RendererAssetStore

    init(rootURL: URL) {
        store = RendererAssetStore(rootURL: rootURL)
    }

    func webView(
        _ webView: WKWebView,
        start urlSchemeTask: any WKURLSchemeTask
    ) {
        guard let requestURL = urlSchemeTask.request.url,
              let fileURL = store.assetURL(for: requestURL) else {
            urlSchemeTask.didFailWithError(
                CocoaError(.fileReadNoPermission)
            )
            return
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let response = URLResponse(
                url: requestURL,
                mimeType: RendererAssetStore.mimeType(for: fileURL),
                expectedContentLength: data.count,
                textEncodingName: fileURL.pathExtension == "html"
                    ? "utf-8"
                    : nil
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            urlSchemeTask.didFailWithError(error)
        }
    }

    func webView(
        _ webView: WKWebView,
        stop urlSchemeTask: any WKURLSchemeTask
    ) {}
}
