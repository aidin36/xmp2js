# Convert XMP to JS Object, and vice versa

Extensible Metadata Platform (XMP) is a subset of RDF/XML. It's used to store metadata about media files (images and vides).

It's not easy to work with in Javascript (and Typescript). This package let you work with these metadata using JS Objects rather than XML.

Currently, it's tested and implemented based on IPTC standard. It should be able to parse any type of XMP because the data format is standard. But I didn't try it. Please open an `issue` if you encountered any problems.

## Install

Using `npm`:

```bash
npm install @aidin36/xmp2js
```

## API

The package provides two methods:

### xmp2js

```typescript
xmp2js(xmpStr: string): XMP
```

It converts an XMP to a JS Object. You can see the tests for some examples of how the output will look like. Check `tests/data/` directory. As a short example:

```xml
<Iptc4xmpExt:LocationCreated>
 <rdf:Bag>
  <rdf:li rdf:parseType='Resource'>
   <Iptc4xmpExt:City>City A</Iptc4xmpExt:City>
   <Iptc4xmpExt:CountryCode>R23</Iptc4xmpExt:CountryCode>
   <Iptc4xmpExt:LocationId>
    <rdf:Bag>
     <rdf:li>Location Id A</rdf:li>
    </rdf:Bag>
   </Iptc4xmpExt:LocationId>
   <Iptc4xmpExt:LocationName>
    <rdf:Alt>
     <rdf:li xml:lang='x-default'>Location Name A</rdf:li>
     <rdf:li xml:lang='fa-IR'>موقعیت مکانی اول</rdf:li>
    </rdf:Alt>
   </Iptc4xmpExt:LocationName>
  </rdf:li>
 </rdf:Bag>
</Iptc4xmpExt:LocationCreated>
```

The above XMP will become this Object:

```javascript
LocationCreated: [
  {
    City: 'City A',
    CountryCode: 'R23',
    LocationId: ['Location Id A'],
    LocationName: {
      'x-default': 'Location Name A',
      'fa-IR': 'موقعیت مکانی اول',
    },
  },
]
```

### js2xmp

```typescript
js2xmp(jsObject: XMP): string
```

Converts a JS Object to XMP.

The JS Object should be in the same format as what xmp2js method produces.

At the moment, this method is not implemented.

## Development

Install the dependencies:

```bash
npm install
```

To run the tests:

```bash
npm test
```

## Copyright and License

Copyright 2025 © Aidin Gharirbnavaz

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with this program. If not, see <https://www.gnu.org/licenses/>.
