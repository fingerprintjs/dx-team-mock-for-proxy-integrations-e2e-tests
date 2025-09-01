const fromCodePoint = (...codePoints: number[]) => String.fromCodePoint(...codePoints)

const nfc = ['fingerprínt', 'fráud']
const nfd = ['fingerpri\u0301nt', 'fra\u0301ud']
const zwj = [
  `${fromCodePoint(0x1f9d1)}\u200D${fromCodePoint(0x1f4bb)}`,
  fromCodePoint(0x1f44d, 0x1f3fd),
  `${fromCodePoint(0x2764)}\uFE0F`,
]
const zeroWidthSpace = 'finger\u200Bprint'
const rtl = `\u202Bتم التحقق من البصمة\u202C \u202Bטביעת האצבע אומתה\u202C`

export const diverseUnicodeJavascript = `export const fp = "fingerprínt";
console.log("fra\u0301ud");`

export const diverseUnicode = [nfc.join(' '), nfd.join(' '), zwj.join(' '), zeroWidthSpace, rtl].join(' | ')
