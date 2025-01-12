import { it, expect } from '@jest/globals'

import { xmp2js } from '../src/index'
import { iptcStd2024Xmp, iptcStd2024Js } from './data/iptc-std-2024.1'

it('should read IPTC std 2024.1 xmp data', () => {
  // IPTC standard provides a JPEG file with this XMP data.

  const actualJs = xmp2js(iptcStd2024Xmp)

  console.log(JSON.stringify(actualJs, null, 2))

  expect(actualJs).toEqual(iptcStd2024Js)
})
