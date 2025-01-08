export type XMP = Record<string, Record<string, string> | string>

export const xmp2js = (xmpStr: string): XMP => {}

export const js2xmp = (jsObject: XMP): string => {}
