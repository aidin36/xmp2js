import { it } from '@jest/globals'

import { xmp2js } from '../src/index'
import { iptcStd2024Xmp } from './data/iptc-std-2024.1'

it('should read IPTC std 2024.1 xmp data', () => {
  // IPTC standard provides a JPEG file with this XMP data.

  xmp2js(iptcStd2024Xmp)
})
