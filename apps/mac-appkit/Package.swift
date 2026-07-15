// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "FetchMojiAppKit",
    platforms: [.macOS(.v14)],
    products: [
        .executable(name: "FetchMojiAppKit", targets: ["FetchMojiAppKit"]),
    ],
    targets: [
        .executableTarget(
            name: "FetchMojiAppKit",
            path: "Sources/FetchMojiAppKit"
        ),
        .testTarget(
            name: "FetchMojiAppKitTests",
            dependencies: ["FetchMojiAppKit"],
            path: "Tests/FetchMojiAppKitTests"
        ),
    ]
)
