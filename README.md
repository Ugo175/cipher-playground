# Cipher Playground

An educational workbench for Caesar and substitution ciphers, letter-frequency analysis, and ranked Caesar decoding candidates. Case and non-ASCII characters are preserved.

## Run

```sh
python3 cipher.py caesar --text 'Hello, world!' --shift 7
python3 cipher.py caesar --text 'Olssv, dvysk!' --shift 7 --decrypt
python3 cipher.py substitution --text 'Hello!' --key QWERTYUIOPASDFGHJKLZXCVBNM
python3 cipher.py frequency --file examples/message.txt
python3 cipher.py crack --text 'Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj'
```

A substitution key maps A through Z to the supplied alphabet. Exactly 26 unique ASCII letters are required, ignoring case. Caesar shifts wrap modulo 26, including negative values. Frequency reports counts and percentages across ASCII letters only. `crack` tries all 26 shifts and ranks them by chi-squared distance from a fixed conventional English frequency table; lower is a closer match. Short or unusual text may rank the correct answer poorly, so all candidates are shown. `encryption_shift` is the shift used to create the ciphertext, not the inverse applied to decode it.

These classical ciphers are educational and are not suitable for protecting sensitive information.

## Next steps

Add an interactive puzzle mode, custom frequency tables, and visual substitution-key editing.

## Verification

```sh
python3 -m unittest discover -s tests -v
```

Requires Python 3.9+; no third-party packages or API keys.

## Origins

Inspired by Ugochukwu Igweagu’s CS50 coursework in [the projects collection](https://github.com/Ugo175/projects). This is a new standalone implementation with additional functionality, not a copy of CS50 starter files. See [ATTRIBUTION.md](ATTRIBUTION.md).
