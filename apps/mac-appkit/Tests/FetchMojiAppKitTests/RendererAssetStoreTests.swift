import Foundation
import Testing
@testable import FetchMojiAppKit

@Test func resolvesOnlyRendererSchemeAssetsInsideRoot() {
    let root = URL(fileURLWithPath: "/tmp/fetchmoji-renderer")
    let store = RendererAssetStore(rootURL: root)

    #expect(
        store.assetURL(
            for: URL(string: "fetchmoji://app/assets/app.js")!
        )?.path == "/tmp/fetchmoji-renderer/assets/app.js"
    )
    #expect(
        store.assetURL(
            for: URL(string: "fetchmoji://other/assets/app.js")!
        ) == nil
    )
    #expect(
        store.assetURL(
            for: URL(string: "fetchmoji://app/%2E%2E/secret")!
        ) == nil
    )
}

@Test func assignsExecutableAndStyleMimeTypes() {
    #expect(
        RendererAssetStore.mimeType(
            for: URL(fileURLWithPath: "/tmp/app.js")
        ) == "application/javascript"
    )
    #expect(
        RendererAssetStore.mimeType(
            for: URL(fileURLWithPath: "/tmp/app.css")
        ) == "text/css"
    )
}
