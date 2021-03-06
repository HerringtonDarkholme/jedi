import traverse from '../util/traverse'
import {record2tuple} from '../util/adapter'

export default function sortNodes(tree) {
	return tree::traverse(node => {
		if (node.childNodes) {
			const attributes = [], macros = [], normalNodes = []
			let skips = []
			const flush = to => {
				if (skips.length > 0) {
					to.push(...skips)
					skips = []
				}
			}
			node.childNodes::traverse(node => {
				switch (node.nodeType) {
					case 'skip':
					case 'suppress':
					case 'inject':
						skips.push(node)
						break
					case 'attribute':
						flush(attributes)
						attributes.push(node)
						break
					case 'macro':
						flush(macros)
						macros.push(node)
						break
					case 'instruction':
						if (node.nodeName === 'external') {
							flush(macros)
							macros.push(node)
							break
						}
					case 'fragment': // see https://github.com/baixing/jedi/issues/65
						if (node.nodeName.slice(-1) === '#') {
							skips.push(node)
							break
						}
					default:
						flush(normalNodes)
						normalNodes.push(node)
						break
				}
				return false
			}, undefined, true)
			flush(normalNodes)
			const sorted = macros.concat(normalNodes)
			if (node.nodeType === 'element' || node.nodeType === 'macro') {
				sorted.unshift(...attributes, {nodeType: 'skip', data: ['closeStartTag']})
			} else if (attributes.length > 0) {
				const e = new Error('OnlyElementAllowAttribute')
				e.position = attributes[0].position
				throw e
			}
			node.childNodes = sorted.map(record2tuple)
		}
	}, 'post')
}
