// tslint:disable:no-any
import * as fastXmlParser from "fast-xml-parser";
import { flatMap } from "lodash";
import { IXmlableObject, XmlComponent } from ".";

export const parseOptions = {
    ignoreAttributes: false,
    attributeNamePrefix: "",
    attrNodeName: "_attr",
};

/**
 * Converts the given xml element (in json format) into XmlComponent.
 * Note: If element is array, them it will return ImportedXmlComponent[]. Example for given:
 * element = [
 *  { w:t: "val 1"},
 *  { w:t: "val 2"}
 * ]
 * will return
 * [
 *   ImportedXmlComponent { rootKey: "w:t", root: [ "val 1" ]},
 *   ImportedXmlComponent { rootKey: "w:t", root: [ "val 2" ]}
 * ]
 *
 * @param elementName name (rootKey) of the XmlComponent
 * @param element the xml element in json presentation
 */
export function convertToXmlComponent(elementName: string, element: any): ImportedXmlComponent | ImportedXmlComponent[] {
    const xmlElement = new ImportedXmlComponent(elementName, element._attr);
    if (Array.isArray(element)) {
        const out: any[] = [];
        element.forEach((itemInArray) => {
            out.push(convertToXmlComponent(elementName, itemInArray));
        });
        return flatMap(out);
    } else if (typeof element === "object") {
        Object.keys(element)
            .filter((key) => key !== "_attr")
            .map((item) => convertToXmlComponent(item, element[item]))
            .forEach((converted) => {
                if (Array.isArray(converted)) {
                    converted.forEach(xmlElement.push.bind(xmlElement));
                } else {
                    xmlElement.push(converted);
                }
            });
    } else if (element !== "") {
        xmlElement.push(element);
    }
    return xmlElement;
}

/**
 * Represents imported xml component from xml file.
 */
export class ImportedXmlComponent extends XmlComponent {
    /**
     * Converts the xml string to a XmlComponent tree.
     *
     * @param importedContent xml content of the imported component
     */
    public static fromXmlString(importedContent: string): ImportedXmlComponent {
        const imported = fastXmlParser.parse(importedContent, parseOptions);
        const elementName = Object.keys(imported)[0];

        const converted = convertToXmlComponent(elementName, imported[elementName]);

        if (Array.isArray(converted) && converted.length > 1) {
            throw new Error("Invalid conversion, input must be one element.");
        }
        return Array.isArray(converted) ? converted[0] : converted;
    }

    // tslint:disable-next-line:variable-name
    private readonly _attr: any;

    // tslint:disable-next-line:variable-name
    constructor(rootKey: string, _attr?: any) {
        super(rootKey);
        if (_attr) {
            this._attr = _attr;
        }
    }

    /**
     * Transforms the object so it can be converted to xml. Example:
     * <w:someKey someAttr="1" otherAttr="11">
     *    <w:child childAttr="2">
     *    </w:child>
     * </w:someKey>
     * {
     *   'w:someKey': [
     *      {
     *          _attr: {
     *              someAttr: "1",
     *              otherAttr: "11"
     *          }
     *      },
     *      {
     *          'w:child': [
     *              {
     *                  _attr: {
     *                      childAttr: "2"
     *                  }
     *              }
     *           ]
     *      }
     *    ]
     * }
     */
    public prepForXml(): IXmlableObject | undefined {
        const result = super.prepForXml();
        if (!result) {
            return undefined;
        }

        if (!!this._attr) {
            if (!Array.isArray(result[this.rootKey])) {
                result[this.rootKey] = [result[this.rootKey]];
            }
            result[this.rootKey].unshift({ _attr: this._attr });
        }
        return result;
    }

    public push(xmlComponent: XmlComponent): void {
        this.root.push(xmlComponent);
    }
}

/**
 * Used for the attributes of root element that is being imported.
 */
export class ImportedRootElementAttributes extends XmlComponent {
    // tslint:disable-next-line:variable-name
    constructor(private readonly _attr: any) {
        super("");
    }

    public prepForXml(): IXmlableObject {
        return {
            _attr: this._attr,
        };
    }
}
