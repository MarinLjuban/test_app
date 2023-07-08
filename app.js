import _ from "lodash";
import namespace from "@rdfjs/namespace";
import SparqlClient from "sparql-http-client";
import cf from "clownface";
import rdf from "rdf-ext";
import { skos, owl, rdfs } from "@tpluscode/rdf-ns-builders";
import { rdf as rdff } from "@tpluscode/rdf-ns-builders";
import { Readable } from "readable-stream";
import getStream from "get-stream";
import {
  TurtleSerializer,
  JsonLdSerializer,
} from "@rdfjs-elements/formats-pretty";
import fs from "fs";
import {
  PredefinedTypeEnumerationQuery,
  ifcRootAttributeQuery,
  belowAttributesNoEnumerationsQuery,
  upperCaseFirst,
  enumerationAttributeQuery,
  classAtrributeEnumerationQuery,
  fullEnumerationsInAttributesQuery,
  queriedElements,
  ifcToDiscreteObjectArray,
  createIfcEntityClassNode,
  createEnumerationClassNode,
  otlGraph,
  ns,
  createNode,
} from "./utils.js";

// CREATE GRAPH

// OPERATING - LOGIC FUNCTION
async function taxonomyFunction(queried) {
  for (const item of queried) {
    if (ifcToDiscreteObjectArray.includes(item)) {
      const foundItems = await PredefinedTypeEnumerationQuery(item);
      const discreteObject = ns.nen2660term.DiscreteObject;
      for (const foundItem of foundItems) {
        if (
          foundItem.enum?.value != undefined &&
          foundItem.enum?.value.slice(45) != "SITE"
        ) {
          //CREATE CLASS ENUMERATION NODE
          let  prefLabel = otlGraph.literal(
            _.startCase(`${foundItem.subObject?.value.slice(48)}`) +
              " " +
              _.startCase(`${foundItem.enum?.value.slice(45)}`),
            "en"
          );
          let  subjectNode =
            ns.otl[
              `${foundItem.subObject?.value.slice(
                48
              )}-${foundItem.enum?.value.slice(45)}`
            ];
          const otlObjectNode =
            ns.otl[`${foundItem.subObject?.value.slice(48)}`];
          const ifcClassEnumerationNode = ns.ifc[`${foundItem.enum?.value.slice(45)}`];
          createNode(subjectNode, rdff.type, owl.Class);
          createNode(subjectNode, rdfs.subClassOf, otlObjectNode);
          createNode(subjectNode, rdfs.seeAlso, ifcClassEnumerationNode);
          createNode(subjectNode, skos.prefLabel, prefLabel);

          //CREATE IFC CLASS NODE
          prefLabel = otlGraph.literal(_.startCase(`${foundItem.subObject?.value.slice(48)}`), "en");
          subjectNode = ns.otl[`${foundItem.subObject?.value.slice(48)}`];
          const ifcClassNode = ns.ifc[`${foundItem.subObject?.value.slice(45)}`];
          createNode(subjectNode, rdff.type, owl.Class)
          createNode(subjectNode, rdfs.subClassOf, discreteObject);
          createNode(subjectNode, rdfs.seeAlso, ifcClassNode)
          createNode(subjectNode, skos.prefLabel, prefLabel)

        } else if (foundItem.enum?.value.slice(45) === "SITE") {
          continue;
        } else {

          //CREATE IFC CLASS NODE
          const discreteObject = ns.nen2660term.DiscreteObject
          const prefLabel = otlGraph.literal(_.startCase(`${foundItem.subObject?.value.slice(45).slice(3)}`), "en");
          const subjectNode = ns.otl[`${foundItem.subObject?.value.slice(48)}`];
          const ifcClassNode = ns.ifc[`${foundItem.subObject?.value.slice(45)}`];
          createNode(subjectNode, rdff.type, owl.Class)
          createNode(subjectNode, rdfs.subClassOf, discreteObject)
          createNode(subjectNode, rdfs.seeAlso, ifcClassNode)
          createNode(subjectNode, rdfs.prefLabel, prefLabel)
         
        }
      }
    } else if (item === "IfcOpeningElement") {
      const foundItems = await PredefinedTypeEnumerationQuery(item);
      const physicalObject = ns.nen2660term.PhysicalObject;
      for (const foundItem of foundItems) {
        if (foundItem.enum?.value != undefined) {
          createEnumerationClassNode(
            foundItem.enum?.value.slice(45),
            foundItem.subObject?.value.slice(48)
          );
          createIfcEntityClassNode(
            foundItem.subObject?.value.slice(45),
            physicalObject.value
          );
        } else {
          createIfcEntityClassNode(
            foundItem.subObject?.value.slice(45),
            physicalObject.value
          );
        }
      }
    } else {
      const foundItems = await PredefinedTypeEnumerationQuery(item);
      const spatialRegion = ns.nen2660term.SpatialRegion;
      for (const foundItem of foundItems) {
        if (foundItem.enum?.value != undefined) {
          createEnumerationClassNode(
            foundItem.enum?.value.slice(45),
            foundItem.subObject?.value.slice(48)
          );
          createIfcEntityClassNode(
            foundItem.subObject?.value.slice(45),
            spatialRegion.value
          );
        } else {
          createIfcEntityClassNode(
            foundItem.subObject?.value.slice(45),
            spatialRegion.value
          );
        }
      }
    }
  }
}

// RUN

async function ifcRootAttributeFunction(queried) {
  for (const item of queried) {
    const attributes = await ifcRootAttributeQuery(item);
    for (const attribute of attributes) {
      const subjectNode =
        ns.otl[
          `${upperCaseFirst(attribute.attribute.value.slice(45).split("_")[0])}`
        ];
      createNode(subjectNode, rdff.type, owl.DatatypeProperty);
    }
  }
}

async function belowAttributesNoEnumerationsFunction(queried) {
  for (const item of queried) {
    const attributes = await belowAttributesNoEnumerationsQuery(item);
    for (const attribute of attributes) {
      const subjectNode =
        ns.otl[`${attribute.attribute.value.slice(45).split("_")[0]}`];

      if (attribute.upAtt.value.slice(45) === "IfcPositiveLengthMeasure") {
        const quantityKind = ns.quantitykind[`${"Area"}`];
        createNode(subjectNode, rdff.type, owl.ObjectProperty);
        createNode(subjectNode, ns.nen2660.hasQuantityKind, quantityKind);
        createNode(subjectNode, rdfs.range, ns.nen2660.QuantityValue);
      } else if (attribute.upAtt.value.slice(45) === "IfcAreaMeasure") {
        const quantityKind = ns.quantitykind[`${"Force"}`];
        createNode(subjectNode, rdff.type, owl.ObjectProperty);
        createNode(subjectNode, ns.nen2660.hasQuantityKind, quantityKind);
        createNode(subjectNode, rdfs.range, ns.nen2660.QuantityValue);
      } else if (attribute.upAtt.value.slice(45) === "IfcForceMeasure") {
        const quantityKind = ns.quantitykind[`${"Force"}`];
        createNode(subjectNode, rdff.type, owl.ObjectProperty);
        createNode(subjectNode, ns.nen2660.hasQuantityKind, quantityKind);
        createNode(subjectNode, rdfs.range, ns.nen2660.QuantityValue);
      } else if (
        attribute.upAtt.value.slice(45) === "IfcNormalisedRatioMeasure"
      ) {
        const quantityKind =
          ns.quantitykind[`${"NormalizedDimensionlessRatio"}`];
        createNode(subjectNode, rdff.type, owl.ObjectProperty);
        createNode(subjectNode, ns.nen2660.hasQuantityKind, quantityKind);
        createNode(subjectNode, rdfs.range, ns.nen2660.QuantityValue);
      } else if (attribute.upAtt.value.slice(45) === "IfcPressureMeasure") {
        const quantityKind = ns.quantitykind[`${"Pressure"}`];
        createNode(subjectNode, rdff.type, owl.ObjectProperty);
        createNode(subjectNode, ns.nen2660.hasQuantityKind, quantityKind);
        createNode(subjectNode, rdfs.range, ns.nen2660.QuantityValue);
      }
    }
  }
}

async function getEnumerationAttributes() {
  const totalDict = {};
  const subObjectsSparql = await classAtrributeEnumerationQuery();
  const subObjects = [];
  for (const i of subObjectsSparql) {
    subObjects.push(i.subObject.value.slice(45));
  }

  for (const subObject of subObjects) {
    const smallDict = {};
    const smallerDict = {};
    const enumSparql = await fullEnumerationsInAttributesQuery(subObject);
    const enums = [];
    for (const i of enumSparql) {
      enums.push(i.enum.value.slice(45));

      smallerDict[i.upAtt.value.slice(45)] = enums;
      smallDict[i.attribute.value.slice(45).split("_")[0]] = smallerDict;
      totalDict[i.subObject.value.slice(45)] = smallDict;
    }
  }

  return totalDict;
}

const enumerationAttributes = await getEnumerationAttributes();

async function getEnumerationLists() {
  const totalDict = {};
  for (let i of Object.keys(enumerationAttributes)) {
    const attribute = Object.keys(enumerationAttributes[i]);
    const unit = Object.keys(enumerationAttributes[i][attribute]);
    let enumerations = Object.values(enumerationAttributes[i][attribute][unit]);
    let arrLen = enumerations.length;
    let enumDict = { [`${unit}-list-0`]: enumerations };
    for (let i = 0; i < arrLen - 1; i++) {
      enumerations = enumerations.slice(1);
      enumDict[`${unit}-list-${i + 1}`] = enumerations;
      totalDict[attribute] = enumDict;
    }
  }
  return totalDict;
}

async function createIndividualEnumerationNodes() {
  for (let i of Object.keys(enumerationAttributes)) {
    const otlClass = i.slice(3);
    const attribute = Object.keys(enumerationAttributes[i]);
    const unit = Object.keys(enumerationAttributes[i][attribute]);
    let enumerations = Object.values(enumerationAttributes[i][attribute][unit]);
    const otlAttribute = `${attribute}-${otlClass}`;
    const definition = otlGraph.literal(
      `This is an enumeration of the ${attribute} attribute of the otl:${otlClass} class`,
      "en"
    );
    for (let enumeration of enumerations) {
      const prefLabel = otlGraph.literal(_.startCase(enumeration), "en");
      const subject = ns.otl[enumeration];
      createNode(subject, rdff.type, ns.otl[otlAttribute]);
      createNode(subject, skos.definition, definition);
      createNode(subject, skos.prefLabel, prefLabel);
    }
  }
}

async function createEnumerationAttributeNodes() {
  const enumerationLists = await getEnumerationLists();
  for (let j of Object.keys(enumerationAttributes)) {
    const otlClass = j.slice(3);
    const attribute = Object.keys(enumerationAttributes[j]);
    const subject =
      ns.otl[`${Object.keys(enumerationAttributes[j])[0]}-${j.slice(3)}`];
    const definition = otlGraph.literal(
      `This is an enumeration list of the ${attribute} attribute of the otl:${otlClass} class`,
      "en"
    );
    let unit = Object.keys(enumerationAttributes[j][attribute]);
    if (typeof unit !== "string") {
      unit = String(unit);
    }
    unit = unit.substring(3);
    const firstList =
      ns.otl[
        String(
          Object.keys(
            enumerationLists[Object.keys(enumerationAttributes[j])[0]]
          )[0]
        ).substring(3)
      ];

    createNode(ns.otl[attribute], rdff.type, owl.ObjectProperty);

    createNode(ns.otl[unit], rdff.type, owl.Class);
    createNode(ns.otl[unit], rdff.type, ns.sh.NodeShape);
    createNode(ns.otl[unit], rdfs.subClassOf, ns.nen2660.EnumerationType);
    createNode(ns.otl[unit], skos.definition, definition);
    createNode(ns.otl[unit], ns.sh.in, firstList);

    createNode(subject, rdff.type, ns.sh.PropertyShape);
    createNode(subject, ns.sh.path, ns.otl[attribute]);
    createNode(subject, ns.sh.class, ns.otl[unit]);
    createNode(subject, ns.sh.minCount, otlGraph.literal(0, ns.xsd.integer));
    createNode(subject, ns.sh.maxCount, otlGraph.literal(1, ns.xsd.integer));
  }
}

async function createIndividualListNodes() {
  const enumerationLists = await getEnumerationLists();
  for (let i of Object.values(enumerationLists)) {
    const entries = Object.entries(i);
    for (let index = 0; index < entries.length; index++) {
      const [key, value] = entries[index];
      let subject = ns.otl[key.substring(3)];

      const rest = "https://www.w3.org/1999/02/22-rdf-syntax-ns#rest";
      if (value.length > 1) {
        const enumeration = ns.otl[`${value[0]}`];

        createNode(subject, rdff.type, rdff.List);
        createNode(subject, rdff.first, enumeration);

        // ACCESSING THE NEXT KEY

        if (index < entries.length - 1) {
          let nextKey = entries[index + 1][0];
          nextKey = String(nextKey).substring(3);
          nextKey = ns.otl[nextKey];
          createNode(subject, rest, nextKey);
        }
      } else {
        const enumeration = ns.otl[`${value[0]}`];
        createNode(subject, rdff.type, rdff.List);
        createNode(subject, rdff.first, enumeration);
        createNode(subject, rest, rdff.nil);
      }
    }
  }
}

async function runProgram() {
  await taxonomyFunction(queriedElements);
  await ifcRootAttributeFunction(queriedElements);
  await belowAttributesNoEnumerationsFunction(queriedElements);
  await createEnumerationAttributeNodes();
  await createIndividualListNodes();
  await createIndividualEnumerationNodes();
  const data = otlGraph.dataset;

  const prefixes = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    ifc: "https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#",
    owl: "http://www.w3.org/2002/07/owl#",
    otl: "https://otl.buildingsmart.org/IFC4_ADD2_TC1/def/",
    nen2660term: "https://w3id.org/nen2660/term#",
    sh: "http://www.w3.org/ns/shacl#",
    xsd: "http://www.w3.org/2001/XMLSchema#",
  };

  const ttlsink = new TurtleSerializer({ prefixes });
  const ldsink = new JsonLdSerializer({ prefixes });

  const ttlStream = await ttlsink.import(Readable.from(data));
  const ttlOutput = await getStream(ttlStream);

  const ldStream = await ldsink.import(Readable.from(data));
  const ldOutput = await getStream(ldStream);

  ttlOutput.replace(/[{()}]/g, "");
  fs.writeFileSync("IFC4OTLNew12.ttl", ttlOutput);
  fs.writeFileSync("IFC4OTLNew12.jsonld", ldOutput);
}

runProgram();
