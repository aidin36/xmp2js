import { parseXMP, XMP } from './xmpParser'

export { XMP } from './xmpParser'

export const xmp2js = (xmpStr: string): XMP => parseXMP(xmpStr)

export const js2xmp = (jsObject: XMP): string => ''
