import { it, expect } from '@jest/globals'

import { xmp2js } from '../src/index'
import { iptcStd2024Xmp, iptcStd2024Js } from './data/iptc-std-2024.1'
import { digikamMultiLangXmp, digikamMultiLangJs } from './data/digikam-multi-langs'

it('should read IPTC std 2024.1 xmp data', () => {
  // IPTC standard provides a JPEG file with this XMP data.

  const actualJs = xmp2js(iptcStd2024Xmp)

  expect(actualJs).toEqual(iptcStd2024Js)
})

it('should read XMP with multiple languages', () => {
  const actualJs = xmp2js(digikamMultiLangXmp)

  expect(actualJs).toEqual(digikamMultiLangJs)
})
