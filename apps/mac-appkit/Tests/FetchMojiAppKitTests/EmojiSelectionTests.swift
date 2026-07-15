import Testing
@testable import FetchMojiAppKit

@Test func acceptsEmojiSelections() {
    #expect(EmojiSelection.isValid("😂"))
    #expect(EmojiSelection.isValid("❤️"))
    #expect(EmojiSelection.isValid("👨‍👩‍👧‍👦"))
}

@Test func rejectsEmptyControlAndOversizedSelections() {
    #expect(!EmojiSelection.isValid(""))
    #expect(!EmojiSelection.isValid("😂\n"))
    #expect(!EmojiSelection.isValid(String(repeating: "😂", count: 40)))
}
