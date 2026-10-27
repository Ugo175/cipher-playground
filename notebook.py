"""Browser reports and original practice puzzles, built on the CLI cipher engine."""
import re
from cipher import ALPHABET, caesar, substitute, frequency, crack, ascii_letters

MAX_TEXT=20000
PUZZLES=[
    {'id':'note-01','title':'The meeting place','plaintext':'Meet me where the old library meets the river.','shift':3,'hint':'The original letter M became P. Count the steps.'},
    {'id':'note-02','title':'A little discovery','plaintext':'A small clue can open a much bigger mystery.','shift':11,'hint':'Look for the single-letter word. In English, A and I are useful starting points.'},
    {'id':'note-03','title':'Find the pattern','plaintext':'The best way to learn a pattern is to change it.','shift':19,'hint':'Try all 26 shifts, or look for a familiar three-letter word.'},
]


def text(payload):
    value=payload.get('text')
    if not isinstance(value,str) or len(value)>MAX_TEXT:
        raise ValueError('Provide text of at most 20,000 characters.')
    return value


def stats(value):
    letters=ascii_letters(value)
    return {'letters':len(letters),'unique_letters':len(set(letters)),'characters':len(value)}


def transform(payload):
    value=text(payload)
    method=payload.get('method','caesar')
    direction=payload.get('direction','encode')
    if direction not in ('encode','decode'):
        raise ValueError('Choose encode or decode.')
    decode=direction=='decode'
    if method=='caesar':
        shift=payload.get('shift',3)
        if isinstance(shift,bool) or not isinstance(shift,int) or abs(shift)>1000000:
            raise ValueError('Shift must be a whole number from -1,000,000 to 1,000,000.')
        output=caesar(value,-shift if decode else shift)
        mapped=caesar(ALPHABET,-shift if decode else shift)
        key=None
    elif method=='substitution':
        key=payload.get('key')
        output=substitute(value,key,decode)
        mapped=substitute(ALPHABET,key,decode)
        shift=None
    else:
        raise ValueError('Choose Caesar or substitution.')
    return {'output':output,'method':method,'direction':direction,'shift':shift % 26 if shift is not None else None,
            'key':key,'mapping':[{'from':a.upper(),'to':b.upper()} for a,b in zip(ALPHABET,mapped)],
            'input_frequency':frequency(value),'output_frequency':frequency(output),**stats(value)}


def analyze(payload):
    value=text(payload)
    return {'frequency':frequency(value),'guesses':crack(value) if ascii_letters(value) else [],**stats(value)}


def challenges():
    return [{'id':p['id'],'title':p['title'],'hint':p['hint'],'ciphertext':caesar(p['plaintext'],p['shift'])} for p in PUZZLES]


def check(payload):
    puzzle=next((p for p in PUZZLES if p['id']==payload.get('id')),None)
    if puzzle is None:
        raise ValueError('Choose a known challenge.')
    answer=payload.get('answer','')
    if not isinstance(answer,str) or len(answer)>MAX_TEXT:
        raise ValueError('Provide an answer of at most 20,000 characters.')
    reveal=payload.get('reveal',False)
    if not isinstance(reveal,bool):
        raise ValueError('reveal must be a boolean.')
    canonical=lambda value: re.sub(r'\s+',' ',value.strip()).casefold()
    correct=canonical(answer)==canonical(puzzle['plaintext'])
    result={'correct':correct,'revealed':reveal,'message':'You found the message.' if correct else 'Answer revealed.' if reveal else 'Not quite. Try a different shift and check the punctuation.'}
    if correct or reveal:
        result.update({'plaintext':puzzle['plaintext'],'shift':puzzle['shift']})
    return result
