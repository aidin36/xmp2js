import { parseXMP, XMP } from './xmpParser'

export { XMP, XMPNode } from './xmpParser'

/**
 * Converts an XMP to a JS Object.
 */
export const xmp2js = (xmpStr: string): XMP => parseXMP(xmpStr)

/**
 * Converts a JS Object to XMP.
 * The JS Object should be in the same format as what xmp2js method
 * produces.
 *
 * Note that this method is not implemented yet.
 */
// export const js2xmp = (jsObject: XMP): string => {
//   throw Error('Not implemented yet.')
// }
