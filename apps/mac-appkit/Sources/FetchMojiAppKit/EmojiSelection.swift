import Foundation

enum EmojiSelection {
    static func isValid(_ value: String) -> Bool {
        guard !value.isEmpty, value.utf8.count <= 64 else { return false }
        return value.unicodeScalars.allSatisfy { scalar in
            !(scalar.value <= 0x1F || (0x7F...0x9F).contains(scalar.value))
        }
    }
}
