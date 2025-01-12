import {
  DOMParser as XMLDomDOMParser,
  Node as XMLDomNode,
  Element as XMLDomElement,
  NodeList as XMLDomNodeList,
} from '@xmldom/xmldom'

type XMPNode = string | Record<string, string> | { [k: string]: XMPNode } | Array<string> | Array<XMPNode>

export type XMP = Record<string, XMPNode>

const isElementNode = (node: Node | ChildNode | XMLDomNode): node is Element | XMLDomElement =>
  node.nodeType === node.ELEMENT_NODE && 'hasAttribute' in node && 'localName' in node

/**
 * When DOMParser parses the XMP, there are some empty Text Nodes among the nodes, for some reason.
 * This method filters them out.
 */
const filterElementNodes = (nodes: NodeListOf<ChildNode> | XMLDomNodeList<XMLDomNode>) => {
  const result: (Element | XMLDomElement)[] = []
  for (const node of nodes) {
    if (isElementNode(node)) {
      result.push(node)
    }
  }
  return result
}

const parseAltNode = (node: Element | XMLDomElement): Record<string, string> => {
  // <rdf:Alt>'s children nodes have an xml:lang attribute. This node represents same
  // value in multiple languages.
  // Example:
  //   <rdf:Alt>
  //    <rdf:li xml:lang='x-default'>description text</rdf:li>
  //    <rdf:li xml:lang='en'>description text in English</rdf:li>
  //   </rdf:Alt>
  //
  // We parse it as:
  //   {
  //     'x-default': 'description text',
  //     'en': 'description text in English'
  //   }
  //

  const result: Record<string, string> = {}

  filterElementNodes(node.childNodes).forEach((childNode) => {
    const lang = childNode.getAttribute('xml:lang')
    const text = childNode.textContent
    if (lang == null) {
      console.warn(`Found a node under <rdf:Alt> without 'xml:lang' attribute. Ignoring. Node:\n${childNode}`)
    } else if (text == null || text === '') {
      console.warn(`Found a node under <rdf:Alt> without text. Ignoring. Node:\n${childNode}`)
    } else {
      result[lang] = text
    }
  })

  return result
}

const parseBagOrSeqNode = (node: Element | XMLDomElement): Array<XMPNode> => {
  // <rdf:Bag> tag contains a list of simple text nodes, or other <rdf:Alt> and <rdf:Bag> tags.
  // Example:
  //    <rdf:Bag>
  //      <rdf:li rdf:parseType='Resource'>
  //        <Iptc4xmpExt:CvId>http://example.com/cv/</Iptc4xmpExt:CvId>
  //        <Iptc4xmpExt:CvTermId>http://example.com/cv/code987</Iptc4xmpExt:CvTermId>
  //        <Iptc4xmpExt:CvTermName>
  //         <rdf:Alt>
  //          <rdf:li xml:lang='x-default'>CV-Term Name 1</rdf:li>
  //         </rdf:Alt>
  //        </Iptc4xmpExt:CvTermName>
  //        <Iptc4xmpExt:CvTermRefinedAbout>http://example.com/cv/refinements2/</Iptc4xmpExt:CvTermRefinedAbout>
  //     </rdf:li>
  //    </rdf:Bag>
  //
  // Parsed object will be:
  // {
  //    [
  //       {
  //          "CvId": "http://example.com/cv/",
  //          "CvTermId": "http://example.com/cv/code987",
  //          "CvTermName": {
  //             "x-default": "CV-Term Name 1"
  //          }
  //       }
  //    ]
  // }
  //
  // We always transform <rdf:Bag> to a list.
  // <rdf:li> tag represetns an item in a list. In the above example, there can be multiple <rdf:li>
  // tags with the similar content.

  let result: Array<XMPNode> = []

  filterElementNodes(node.childNodes).forEach((childNode) => {
    if (childNode.nodeName !== 'rdf:li') {
      console.warn(
        `Expected to see <rdf:li> node under <rdf:Bag> and <ref:Seq>, but found <${childNode.nodeName}>. Ignoring.`
      )
    } else {
      if (childNode.getAttribute('rdf:parseType') === 'Resource') {
        let parsedLi = {}
        filterElementNodes(childNode.childNodes).forEach((grandChild) => {
          // Parsing the nodes inside the <rdf:li> node.
          parsedLi = parseNode(parsedLi, grandChild)
        })
        result.push(parsedLi)
      } else {
        // It must be a simple 'li' node. For example:
        //   <rdf:Bag>
        //     <rdf:li>011232</rdf:li>
        //     <rdf:li>012232</rdf:li>
        //   </rdf:Bag>
        const textContent = childNode.textContent
        if (!textContent) {
          console.warn(
            `Found a <rdf:li> node without text or 'rdf:parseType = Resource'. Ignoring. Node:\n${childNode}`
          )
        } else {
          result.push(textContent)
        }
      }
    }
  })

  return result
}

// TODO: Here and everywhere else, we should convert HTML codes to string. i.e. &#39; should become '
const parseListOfNodes = (node: Element | XMLDomElement): Record<string, string> => {
  // Parses a list like this:
  //   <Iptc4xmpCore:CreatorContactInfo rdf:parseType='Resource'>
  //     <Iptc4xmpCore:CiAdrCity>Creator&#39;s CI: City</Iptc4xmpCore:CiAdrCity>
  //     <Iptc4xmpCore:CiAdrExtadr>Creator&#39;s CI: Address, line 1</Iptc4xmpCore:CiAdrExtadr>
  //   </Iptc4xmpCore:CreatorContactInfo>
  //
  // The result will be:
  //   {
  //     "CiAdrCity": "Creator's CI: City"
  //     "CiAdrExtadr": "Creator's CI: Address, line 1"
  //   }
  //
  // Note that the parent picks up the root node's name, and calls this function like this:
  //   result[root.nodeName] = parseTextListNode(root)

  const result: Record<string, string> = {}

  filterElementNodes(node.childNodes).forEach((childNode) => {
    const key = childNode.localName
    const textContent = childNode.textContent
    if (key == null || key === '' || textContent == null || textContent === '') {
      console.warn(`Unexpected node. Either 'nodeName' or 'textContent' is empty. Node:\n${childNode}`)
    } else {
      result[key] = textContent
    }
  })

  return result
}

const parseNode = (result: XMP, node: Element | XMLDomElement): XMP => {
  const keyName = node.localName
  if (keyName == null) {
    console.warn(`Found an element node without a name! Ignoring.\n${node}`)
    return result
  }

  const childNodes = filterElementNodes(node.childNodes)

  if (childNodes.length === 0) {
    if (node.textContent == null) {
      console.warn(`Found a node without text or children! Ignoring.\n${node}`)
      return result
    }
    // A simple node.
    result[keyName] = node.textContent
    return result
  }

  if (childNodes.length != 1) {
    if (node.getAttribute('rdf:parseType') === 'Resource' && node.childNodes.length > 0) {
      result[keyName] = parseListOfNodes(node)
      return result
    }
  } else {
    const childNode = childNodes[0]
    if (childNode.nodeName == null || childNode.nodeName === '') {
      console.warn(`Found a child node without a 'nodeName'. Ignoring. Node:\n${childNode}`)
      return result
    }

    if (childNode.nodeName === 'rdf:Alt') {
      result[keyName] = parseAltNode(childNode)
      return result
    }

    if (childNode.nodeName === 'rdf:Bag' || childNode.nodeName === 'rdf:Seq') {
      result[keyName] = parseBagOrSeqNode(childNode)
      return result
    }
  }

  console.warn(`Don't know how to parse this type of node: <${node.nodeName}> Ignoring.`)
  return result
}

/**
 * @internal
 */
export const parseXMP = (xmpStr: string) => {
  // The standard is explained here:
  // https://www.iptc.org/std/photometadata/specification/IPTC-PhotoMetadata#xmp-namespaces-and-identifiers
  // https://iptc.org/std/photometadata/specification/iptc-pmd-techreference_2023.2.json

  // Use the browser's DOMParser if available, otherwise use a Ponyfill.
  const parser =
    typeof window !== 'undefined' && window.DOMParser != null ? new window.DOMParser() : new XMLDomDOMParser()

  // White spaces and EOLs will end up as "nodes" in the parsed Doc. So we remove them.
  const xmlDoc = parser.parseFromString(xmpStr.replace(/>\s/g, '>').replace(/\s</g, '<'), 'text/xml')

  let result: XMP = {}

  if (xmlDoc.childNodes[0].nodeType != xmlDoc.PROCESSING_INSTRUCTION_NODE) {
    throw Error(
      `Expected the first node of the XMP to be an Instructional Node, but wasn't. Node: ${xmlDoc.childNodes[0]}`
    )
  }
  if (xmlDoc.childNodes[1].nodeName !== 'x:xmpmeta') {
    throw Error(`Expected the second node of the XMP to be x:xmpmeta, but was ${xmlDoc.childNodes[1].nodeName}`)
  }

  // This is the root node for all the metadata.
  const rdfNode = xmlDoc.childNodes[1].childNodes[0]
  if (rdfNode.nodeName !== 'rdf:RDF') {
    throw Error(`Expected to see the "rdf:RDF" as the root node, but found: ${xmlDoc.nodeName}`)
  }

  filterElementNodes(rdfNode.childNodes).forEach((descriptionNode) => {
    if (descriptionNode.nodeName !== 'rdf:Description') {
      console.log('Not an IPTC node? name=', descriptionNode.nodeName)
      // Not an IPTC node.
    } else {
      filterElementNodes(descriptionNode.childNodes).forEach((tagNode) => {
        result = parseNode(result, tagNode)
      })
    }
  })

  return result
}
