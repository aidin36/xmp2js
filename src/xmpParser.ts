import {
  DOMParser as XMLDomDOMParser,
  Node as XMLDomNode,
  Element as XMLDomElement,
  NodeList as XMLDomNodeList,
} from '@xmldom/xmldom'

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

const parseAltTextAccessibility = (node: Element | XMLDomElement) => {
  // Format is like:
  //   <Iptc4xmpCore:AltTextAccessibility>
  //     <rdf:Alt>
  //       <rdf:li xml:lang='x-default'>Alt Text description</rdf:li>
  //       <rdf:li xml:lang='en'>Alt Text description in English</rdf:li>
  //     </rdf:Alt>
  //   </Iptc4xmpCore:AltTextAccessibility>

  const childNodes = filterElementNodes(node.childNodes)
  if (childNodes.length == 0) {
    throw Error(`Couldn't find an Element node under AltTextAccessibility node`)
  }
  if (childNodes.length > 1) {
    throw Error(`Found more than one Element node under AltTextAccessibility node`)
  }
  const listNode = childNodes[0]
  if (listNode.nodeName !== 'rdf:Alt') {
    throw Error(
      `Expected to find a <rdf:Alt> node under AltTextAccessibility node, but found: ${node.childNodes[0].nodeName}`
    )
  }

  let result: Record<string, string> = {}
  filterElementNodes(listNode.childNodes).forEach((altNode) => {
    const lang = altNode.getAttribute('xml:lang')
    if (lang == null || altNode.textContent == null) {
      console.error(`Found an AltTextAccessibility node with null 'lang' or 'text'. Will continue. Node: ${altNode}`)
    } else {
      result[lang] = altNode.textContent
    }
  })

  return result
}

const defaultParser = (node: Element | XMLDomElement) => {
  // TODO: Go through the nodes and create a map of localName -> textContent
  if (node.localName != null) {
    return { [node.localName]: node.textContent ?? '' }
  }
  return {}
}

const parsers = new Map([['AltTextAccessibility', parseAltTextAccessibility]])

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

  let result: Record<string, Record<string, string> | string> = {}

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
        if (tagNode.localName != null) {
          const parser = parsers.get(tagNode.localName)
          result[tagNode.localName] = parser ? parser(tagNode) : defaultParser(tagNode)
        }
      })
    }
  })

  console.log('parsed XMP=', result)
}
