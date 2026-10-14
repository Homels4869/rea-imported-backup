# Identity-signed universal Mach-O with one unsigned slice

Captured on macOS 27.0.1 (26A434), Apple M2, from a copy of `/bin/ls` whose
x86_64 slice was unsigned and recombined with its Apple-signed arm64e and
arm64e.x1 slices. The system file was not modified:

```sh
lipo /bin/ls -thin x86_64 -output ls-x86_64
lipo /bin/ls -thin arm64e -output ls-arm64e
lipo /bin/ls -thin arm64e.x1 -output ls-x1
codesign --remove-signature ls-x86_64
lipo -create ls-x86_64 ls-arm64e ls-x1 -output fixture

codesign -d --verbose=4 fixture 2> display.txt            # exit 0
codesign -d -r- fixture > requirements.txt                 # exit 0
codesign -d -a x86_64 --verbose=4 fixture 2> slice-unsigned.txt  # exit 1
```

The aggregate display and designated requirement describe the signed slice
codesign selects by default and exit 0. Only the per-slice query reports the
unsigned x86_64 slice. `codesign -d -a arm64e.x1` is accepted and reports that
slice's own signature.

The temporary path on the `Executable=` line and in the unsigned diagnostic was
replaced with `/private/fixture`; tool fields are otherwise unchanged.
