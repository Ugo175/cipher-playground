#!/usr/bin/env python3
"""Explore classical ciphers, letter frequencies, and Caesar decoding candidates."""
import argparse
from collections import Counter
import json
from pathlib import Path
import string

ALPHABET = string.ascii_lowercase
EXPECTED = (8.167, 1.492, 2.782, 4.253, 12.702, 2.228, 2.015, 6.094, 6.966,
            .153, .772, 4.025, 2.406, 6.749, 7.507, 1.929, .095, 5.987,
            6.327, 9.056, 2.758, .978, 2.360, .150, 1.974, .074)


def substitute(text, key, decrypt=False):
    key = key.lower()
    if len(key) != 26 or set(key) != set(ALPHABET):
        raise ValueError('Key must contain every ASCII letter exactly once.')
    source, target = (key, ALPHABET) if decrypt else (ALPHABET, key)
    mapping = str.maketrans(source + source.upper(), target + target.upper())
    return text.translate(mapping)


def caesar(text, shift):
    shift %= 26
    return substitute(text, ALPHABET[shift:] + ALPHABET[:shift])


def frequency(text):
    counts = Counter(character for character in text.lower() if character in ALPHABET)
    total = sum(counts.values())
    return {letter: {'count': counts[letter],
                     'percent': round(100 * counts[letter] / total, 2) if total else 0}
            for letter in ALPHABET}


def crack(text):
    total = sum(character in ALPHABET for character in text.lower())
    if not total:
        raise ValueError('Provide text containing ASCII letters.')
    guesses = []
    for shift in range(26):
        decoded = caesar(text, -shift)
        counts = Counter(decoded.lower())
        score = sum((counts[letter] - total * expected / 100) ** 2 / (total * expected / 100)
                    for letter, expected in zip(ALPHABET, EXPECTED))
        guesses.append({'encryption_shift': shift, 'score': round(score, 3), 'text': decoded})
    return sorted(guesses, key=lambda guess: guess['score'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['caesar', 'substitution', 'frequency', 'crack'])
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--text')
    source.add_argument('--file', type=Path)
    parser.add_argument('--shift', type=int, default=3)
    parser.add_argument('--key')
    parser.add_argument('--decrypt', action='store_true')
    args = parser.parse_args()
    try:
        text = args.file.read_text(encoding='utf-8') if args.file else args.text
        if args.mode == 'caesar':
            result = caesar(text, -args.shift if args.decrypt else args.shift)
        elif args.mode == 'substitution':
            if not args.key:
                parser.error('substitution requires --key')
            result = substitute(text, args.key, args.decrypt)
        elif args.mode == 'frequency':
            result = json.dumps(frequency(text), indent=2)
        else:
            result = json.dumps(crack(text), indent=2)
        print(result)
    except (OSError, UnicodeError, ValueError) as error:
        parser.exit(2, f'Error: {error}\n')


if __name__ == '__main__':
    main()
