import unittest
from cipher import caesar, substitute, frequency, crack, ALPHABET

class CipherTests(unittest.TestCase):
    def test_caesar_known_vector(self):
        self.assertEqual(caesar('Hello, World! 123', 7), 'Olssv, Dvysk! 123')
        self.assertEqual(caesar('Abc XYZ', -1), 'Zab WXY')

    def test_roundtrip_long_input_and_unicode(self):
        text = 'Mixed case, café! 123 ' * 100
        for shift in range(-27, 28):
            self.assertEqual(caesar(caesar(text, shift), -shift), text)
        key = 'QWERTYUIOPASDFGHJKLZXCVBNM'
        self.assertEqual(substitute(substitute(text, key), key, True), text)
        self.assertEqual(substitute('ABC xyz', ALPHABET[::-1]), 'ZYX cba')

    def test_bad_keys(self):
        for key in ['', 'a' * 26, ALPHABET[:-1] + '!', ALPHABET[:-1] + 'A']:
            with self.assertRaises(ValueError):
                substitute('hello', key)

    def test_frequency(self):
        self.assertEqual(frequency('Aa, B!')['a'], {'count': 2, 'percent': 66.67})
        self.assertEqual(frequency('!?')['a']['percent'], 0)

    def test_crack_contains_correct_plaintext(self):
        text = 'This is a longer example of ordinary English writing for testing letter frequencies.'
        guesses = crack(caesar(text, 11))
        self.assertEqual(len(guesses), 26)
        self.assertEqual(next(g for g in guesses if g['encryption_shift'] == 11)['text'], text)
        self.assertEqual(guesses, sorted(guesses, key=lambda g: g['score']))
        with self.assertRaises(ValueError):
            crack('123!')
