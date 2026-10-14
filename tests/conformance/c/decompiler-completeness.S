/* Source-owned static analysis fixture. Never execute this program. */
#ifdef __APPLE__
#define ENTRY _main
#define CLEAN_ENTRY _rea_clean
#else
#define ENTRY main
#define CLEAN_ENTRY rea_clean
#endif
.text
.globl ENTRY
#ifndef __APPLE__
#ifdef __aarch64__
.type ENTRY, %function
#else
.type ENTRY, @function
#endif
#endif
ENTRY:
#ifdef __aarch64__
    cmp w0, w0
    b.ne 1f
    mov w0, #7
    ret
1:
    mov w0, #9
    ret
#elif defined(__x86_64__)
    cmp %edi, %edi
    jne 1f
    mov $7, %eax
    ret
1:
    mov $9, %eax
    ret
#else
#error This completeness fixture supports AArch64 and x86_64 hosts.
#endif
#ifndef __APPLE__
.size ENTRY, .-ENTRY
#endif

.globl CLEAN_ENTRY
#ifndef __APPLE__
#ifdef __aarch64__
.type CLEAN_ENTRY, %function
#else
.type CLEAN_ENTRY, @function
#endif
#endif
CLEAN_ENTRY:
#ifdef __aarch64__
    mov w0, #7
    ret
#elif defined(__x86_64__)
    mov $7, %eax
    ret
#endif
#ifndef __APPLE__
.size CLEAN_ENTRY, .-CLEAN_ENTRY
#endif
