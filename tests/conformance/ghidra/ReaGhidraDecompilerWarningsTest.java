public final class ReaGhidraDecompilerWarningsTest {
    private static void require(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }

    public static void main(String[] args) {
        var single = ReaGhidraDecompilerWarnings.observe(
            "/* WARNING: Removing unreachable block (ram,0x0010) */", null, true,
            value -> value.equals("ram:0x0010") ? "0x10" : null);
        require(single.status().equals("warnings"), "single status");
        require(single.warnings().size() == 1 && single.droppedBlocks().size() == 1, "single counts");
        require(single.droppedBlocks().get(0).start().equals("0x10"), "canonical address");
        require(single.droppedBlocks().get(0).reportedOffset().equals("0x0010"), "reported offset retained before normalization");

        var multiple = ReaGhidraDecompilerWarnings.observe(
            "  /* WARNING: Removing unreachable block (ram,0x10) */\n" +
            "\t/* WARNING: First line\n second line */\n" +
            "/* WARNING: Removing unreachable block (rom,0x20) */", null, true, value -> value);
        require(multiple.warnings().size() == 3 && multiple.droppedBlocks().size() == 2, "multiple counts");
        require(multiple.warnings().get(1).contains("\n second line"), "multiline retained");
        require(multiple.droppedBlocks().get(1).warningIndex() == 2, "warning association");

        var diagnostic = ReaGhidraDecompilerWarnings.observe("return 7;", "diagnostic only", true, value -> null);
        require(diagnostic.status().equals("warnings") && diagnostic.warnings().isEmpty(), "diagnostic status");
        require(diagnostic.diagnostic().equals("diagnostic only"), "diagnostic retained");

        var unavailable = ReaGhidraDecompilerWarnings.observe(null, null, false, value -> null);
        require(unavailable.status().equals("unavailable") && unavailable.warnings().isEmpty(), "unavailable");

        var unresolved = ReaGhidraDecompilerWarnings.observe(
            "/* WARNING: Removing unreachable block (unknown,0xdead) */", null, true, value -> null);
        require(unresolved.droppedBlocks().get(0).start() == null, "failed lookup stays unknown");
        require(unresolved.droppedBlocks().get(0).addressSpace().equals("unknown"), "raw space retained");
        require(unresolved.droppedBlocks().get(0).reportedOffset().equals("0xdead"), "unresolved offset retained");

        var quiet = ReaGhidraDecompilerWarnings.observe("return 7;", "  ", true, value -> null);
        require(quiet.status().equals("no-warnings-reported") && quiet.diagnostic() == null, "quiet observation");
        System.out.println("{\"status\":\"passed\",\"cases\":6}");
    }
}
