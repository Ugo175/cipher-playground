import http.client
from http.server import ThreadingHTTPServer
import json
import subprocess
import sys
import threading
import unittest
from cipher import frequency,crack,substitute,ALPHABET
from notebook import transform,analyze,challenges,check,PUZZLES
from server import Handler,MAX_REQUEST

class NotebookTests(unittest.TestCase):
    def test_mapping_and_roundtrip(self):
        result=transform({'text':'Hello, World! 😀','shift':7})
        self.assertEqual(result['output'],'Olssv, Dvysk! 😀')
        self.assertEqual(result['mapping'][0],{'from':'A','to':'H'})
        decoded=transform({'text':result['output'],'shift':7,'direction':'decode'})
        self.assertEqual(decoded['output'],'Hello, World! 😀')
        self.assertEqual(decoded['mapping'][0],{'from':'A','to':'T'})
    def test_substitution_and_non_ascii_key(self):
        result=transform({'text':'Abc XYZ','method':'substitution','key':ALPHABET[::-1]})
        self.assertEqual(result['output'],'Zyx CBA')
        for key in [None,'a'*26,ALPHABET.replace('k','K')]:
            with self.assertRaises(ValueError):substitute('abc',key)
    def test_ascii_frequency_excludes_unicode_case_folding(self):
        self.assertEqual(frequency('KİſAa')['a']['count'],2)
        self.assertEqual(sum(item['count'] for item in frequency('KİſAa').values()),2)
        with self.assertRaises(ValueError):crack('Kİſ')
        self.assertEqual(analyze({'text':'!? 😀'})['guesses'],[])
    def test_shift_validation_and_wrapping(self):
        self.assertEqual(transform({'text':'abc','shift':-1})['output'],'zab')
        self.assertEqual(transform({'text':'abc','shift':26})['output'],'abc')
        for payload in [{'text':1},{'text':'a'*20001},{'text':'a','shift':True},{'text':'a','shift':2.5},{'text':'a','method':'bad'},{'text':'a','direction':'bad'}]:
            with self.assertRaises(ValueError):transform(payload)
    def test_puzzles_do_not_leak_answers_on_wrong_guess(self):
        public=challenges()
        self.assertEqual(len(public),3)
        self.assertNotIn('plaintext',public[0]);self.assertNotIn('shift',public[0])
        wrong=check({'id':public[0]['id'],'answer':'wrong'})
        self.assertFalse(wrong['correct']);self.assertNotIn('plaintext',wrong)
        correct=check({'id':public[0]['id'],'answer':'  '+PUZZLES[0]['plaintext'].upper()+'  '})
        self.assertTrue(correct['correct']);self.assertEqual(correct['shift'],3)
        self.assertTrue(check({'id':public[0]['id'],'reveal':True})['revealed'])
        with self.assertRaises(ValueError):check({'id':'missing'})
    def test_analysis_has_all_shifts(self):
        result=analyze({'text':'Wkh txlfn eurzq ira mxpsv ryhu wkh odcb grj.'})
        self.assertEqual(len(result['guesses']),26)
        match=next(item for item in result['guesses'] if item['encryption_shift']==3)
        self.assertEqual(match['text'],'The quick brown fox jumps over the lazy dog.')

class QuietHandler(Handler):
    def log_message(self,*args):pass

class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),QuietHandler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()
    def request(self,method,path,data=None,headers=None):
        connection=http.client.HTTPConnection('127.0.0.1',self.server.server_port,timeout=3)
        try:
            connection.request(method,path,data,headers or {})
            response=connection.getresponse()
            return response.status,dict(response.getheaders()),response.read()
        finally:connection.close()
    def post(self,path,payload):
        status,_,body=self.request('POST',path,json.dumps(payload),{'Content-Type':'application/json'})
        return status,json.loads(body)
    def test_transform_cli_parity(self):
        status,result=self.post('/api/transform',{'text':'Hello, world!','shift':7})
        cli=subprocess.check_output([sys.executable,'cipher.py','caesar','--text','Hello, world!','--shift','7'],text=True).rstrip('\n')
        self.assertEqual(status,200);self.assertEqual(result['output'],cli)
        status,result=self.post('/api/analyze',{'text':'Hello, world!'})
        cli=json.loads(subprocess.check_output([sys.executable,'cipher.py','frequency','--text','Hello, world!'],text=True))
        self.assertEqual(result['frequency'],cli)
    def test_payload_and_http_errors(self):
        for payload in [None,[],{}, {'text':False}]:self.assertEqual(self.post('/api/transform',payload)[0],400)
        self.assertEqual(self.request('POST','/api/analyze','{',{'Content-Type':'application/json'})[0],400)
        self.assertEqual(self.request('POST','/api/analyze','{}',{'Content-Type':'text/plain'})[0],415)
        self.assertEqual(self.request('POST','/api/analyze',headers={'Content-Type':'application/json','Content-Length':str(MAX_REQUEST+1)})[0],413)
    def test_assets_puzzles_and_origin(self):
        for path in ['/','/app.js','/styles.css','/favicon.svg','/api/challenges']:
            status,headers,body=self.request('GET',path)
            self.assertEqual(status,200);self.assertTrue(body)
            self.assertEqual(headers['X-Content-Type-Options'],'nosniff')
        self.assertEqual(self.request('GET','/cipher.py')[0],404)
        self.assertEqual(self.request('GET','/',headers={'Host':'elsewhere.test'})[0],403)
        self.assertEqual(self.request('POST','/api/analyze','{}',{'Content-Type':'application/json','Origin':'https://elsewhere.test'})[0],403)
