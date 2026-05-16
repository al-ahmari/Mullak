#!/usr/bin/env python3
import sys

def to_rtf_unicode(text):
    result = []
    for ch in text:
        code = ord(ch)
        if code > 127:
            if code > 32767:
                code -= 65536
            result.append(f'\\u{code}?')
        else:
            if ch in ('\\', '{', '}'):
                result.append('\\' + ch)
            else:
                result.append(ch)
    return ''.join(result)

def convert(input_txt, output_rtf):
    with open(input_txt, encoding='utf-8') as f:
        lines = f.read().splitlines()
    rtf_lines = []
    rtf_lines.append(r'{\rtf1\ansi\ansicpg1256\deff0\deflang1025')
    rtf_lines.append(r'{\fonttbl{\f0\froman\fcharset178\fprq2 Arial;}}')
    rtf_lines.append(r'{\colortbl ;\red0\green0\blue0;}')
    rtf_lines.append(r'\widowctrl\hyphauto\rtldoc\deflangfe1025\deflang1025')
    for line in lines:
        encoded = to_rtf_unicode(line if line.strip() else ' ')
        rtf_lines.append(r'{\pard\rtlpar\qr\f0\fs24\lang1025\rtlch ' + encoded + r'\par}')
    rtf_lines.append('}')
    with open(output_rtf, 'w', encoding='ascii') as f:
        f.write('\n'.join(rtf_lines))
    print(f'Created {output_rtf}')

if __name__ == '__main__':
    if len(sys.argv) != 3:
        print('Usage: python3 make_rtl_rtf.py input.txt output.rtf')
        sys.exit(1)
    convert(sys.argv[1], sys.argv[2])
