// Relays a parent "interrupt" message to a real in-process signal so the
// command's cancellation guard runs on every platform. Windows cannot deliver
// a catchable signal through `child.kill(signal)`, so the parent requests the
// interrupt over IPC once the CLI has parked in CDP discovery instead.
const signal = process.env.REA_TEST_INTERRUPT_SIGNAL ?? "SIGINT";
process.on("message", (message) => {
  if (message !== "interrupt") return;
  process.emit(signal);
  // The IPC channel would otherwise keep the child's event loop alive after the
  // command has already settled, hiding the exit status the test asserts.
  process.disconnect();
});
