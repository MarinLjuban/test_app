import namespace from "@rdfjs/namespace";
import SparqlClient from "sparql-http-client";
import cf from "clownface";
import rdf from "rdf-ext";
import _ from "lodash";
import { skos, owl, rdfs } from "@tpluscode/rdf-ns-builders";
import { rdf as rdff } from "@tpluscode/rdf-ns-builders";
import { Readable } from "readable-stream";
import getStream from "get-stream";
import {
  TurtleSerializer,
  JsonLdSerializer,
} from "@rdfjs-elements/formats-pretty";
import fs from "fs";

// CREATE THE NAMESPACES
const ns = {
  ifc: namespace("https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#"),
  otl: namespace("https://otl.buildingsmart.org/IFC4_ADD2_TC1/def/"),
  nen2660term: namespace("https://w3id.org/nen2660/term#"),
};

// CREATE LOCAL SPARQL ENDPOINT
const client = new SparqlClient({
  endpointUrl: "http://DESKTOP-SQ747CJ:7200/repositories/IFC",
});

// CREATE GRAPH
const otlGraph = cf({ dataset: rdf.dataset() });

// CREATE THE ARRAYS FOR QUERYING AND MAPPING
const queriedElements = [
  "IfcBuildingElement",
  "IfcDistributionElement",
  "IfcFurnishingElement",
  "IfcElementComponent",
  "IfcSpatialElement",
];

const IfcToDiscreteObjectArray = [
  "IfcBuildingElement",
  "IfcDistributionElement",
  "IfcFurnishingElement",
  "IfcElementComponent",
];

// CREATE QUERY
async function fullQuery(superclass) {
  const classStream = await client.query.select(`
  PREFIX nen2660: <https://w3id.org/nen2660/def#>
  PREFIX ifc: <http://ifcowl.openbimstandards.org/IFC4_ADD2#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX expr: <https://w3id.org/express#>
  PREFIX zh: <https://w3id.org/ziekenhuis/def#>
  PREFIX owl: <http://www.w3.org/2002/07/owl#>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  PREFIX : <http://ifcowl.openbimstandards.org/IFC4_ADD2#>
  SELECT DISTINCT ?subObject ?directParent ?enum ?type
    WHERE { 
         ?subObject rdfs:subClassOf* ifc:${superclass} .
         ?subObject rdfs:subClassOf ?directParent .
        ?directParent a ?type
      FILTER ( ?type != owl:Restriction)
        FILTER( !regex(str(?directParent), "node", "i") )
         OPTIONAL {
            ?predefinedTypeRelation rdfs:domain ?subObject ;
                                                     rdfs:range ?subObjectEnumType .
            ?enum rdf:type ?subObjectEnumType .
            ?subObjectEnumType rdfs:subClassOf expr:ENUMERATION .
          
            FILTER(?enum != ifc:NOTDEFINED)
            FILTER(?enum != ifc:USERDEFINED)
         }
    }  
  `);

  const classArray = [];

  return new Promise((resolve) => {
    classStream
      .on("data", (row) => {
        classArray.push(row);
      })
      .on("end", () => {
        resolve(classArray);
      });
  });
}

// CREATE THE NODES
function createNodeEnum(subject, object) {
  const prefLabel = otlGraph.literal(
    _.startCase(`${object}`) + " " + _.startCase(`${subject}`),
    "en"
  );
  const mainNode = ns.otl[`${object}-${subject}`];
  const otlObjectNode = ns.otl[`${object}`];
  const ifcEnNode = ns.ifc[`${subject}`];
  otlGraph
    .namedNode(mainNode)
    .addOut(otlGraph.namedNode(rdff.type), otlGraph.namedNode(owl.Class))
    .addOut(
      otlGraph.namedNode(rdfs.subClassOf),
      otlGraph.namedNode(otlObjectNode)
    )
    .addOut(otlGraph.namedNode(rdfs.seeAlso), otlGraph.namedNode(ifcEnNode))
    .addOut(otlGraph.namedNode(skos.prefLabel), prefLabel);
}

function createNodeClass(subject, nenEntity) {
  const prefLabel = otlGraph.literal(_.startCase(`${subject.slice(3)}`), "en");
  const mainNode = ns.otl[`${subject.slice(3)}`];
  const ifcNode = ns.ifc[`${subject}`];

  otlGraph
    .namedNode(mainNode)
    .addOut(otlGraph.namedNode(rdff.type), otlGraph.namedNode(owl.Class))
    .addOut(
      otlGraph.namedNode(rdfs.subClassOf),
      otlGraph.namedNode(`${nenEntity}`)
    )
    .addOut(otlGraph.namedNode(rdfs.seeAlso), otlGraph.namedNode(ifcNode))
    .addOut(otlGraph.namedNode(skos.prefLabel), prefLabel);
}

// CONSOLE LOG
async function logGraph() {
  await logicFunction(queriedElements);
  for (const quad of otlGraph.dataset) {
    console.log(
      `${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`
    );
  }
}

// OPERATING - LOGIC FUNCTION
async function logicFunction(queried) {
  for (const item of queried) {
    if (IfcToDiscreteObjectArray.includes(item)) {
      const foundItems = await fullQuery(item);

      const discreteObject = ns.nen2660term.DiscreteObject;
      for (const item of foundItems) {
        if (item.enum?.value != undefined) {
          createNodeEnum(
            item.enum?.value.slice(45),
            item.subObject?.value.slice(48)
          );
          createNodeClass(
            item.subObject?.value.slice(45),
            discreteObject.value
          );
        } else {
          createNodeClass(
            item.subObject?.value.slice(45),
            discreteObject.value
          );
        }
      }
    } else {
      const foundItems = await fullQuery(item);
      const spatialRegion = ns.nen2660term.SpatialRegion;
      for (const item of foundItems) {
        if (item.enum?.value != undefined) {
          createNodeEnum(
            item.enum?.value.slice(45),
            item.subObject?.value.slice(48)
          );
          createNodeClass(item.subObject?.value.slice(45), spatialRegion.value);
        } else {
          createNodeClass(item.subObject?.value.slice(45), spatialRegion.value);
        }
      }
    }
  }
}

// RUN
async function runProgram() {
  await logicFunction(queriedElements);

  const data = otlGraph.dataset;

  const prefixes = {
    rdf: "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    rdfs: "http://www.w3.org/2000/01/rdf-schema#",
    skos: "http://www.w3.org/2004/02/skos/core#",
    ifc: "https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#",
    owl: "http://www.w3.org/2002/07/owl#",
    otl: "https://otl.buildingsmart.org/IFC4_ADD2_TC1/def/",
    nen2660term: "https://w3id.org/nen2660/term#",
  };

  const ttlsink = new TurtleSerializer({ prefixes });
  const ldsink = new JsonLdSerializer({ prefixes });

  const ttlStream = await ttlsink.import(Readable.from(data));
  const ttlOutput = await getStream(ttlStream);

  const ldStream = await ldsink.import(Readable.from(data));
  const ldOutput = await getStream(ldStream);

  fs.writeFileSync("IFC4OTL.ttl", ttlOutput);
  fs.writeFileSync("IFC4OTL.jsonld", ldOutput);
}

runProgram();
