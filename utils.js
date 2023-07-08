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

const client = new SparqlClient({
  endpointUrl: "http://DESKTOP-SQ747CJ:7200/repositories/IFC",
});

export const otlGraph = cf({ dataset: rdf.dataset() });

export const ns = {
  rdf: namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#"),
  ifc: namespace("https://standards.buildingsmart.org/IFC/DEV/IFC4/ADD2/OWL#"),
  otl: namespace("https://otl.buildingsmart.org/IFC4_ADD2_TC1/def/"),
  nen2660term: namespace("https://w3id.org/nen2660/term#"),
  nen2660: namespace("https://w3id.org/nen2660/def#"),
  sh: namespace("http://www.w3.org/ns/shacl#"),
  qudt: namespace("http://qudt.org/schema/qudt/"),
  quantitykind: namespace("http://qudt.org/2.1/vocab/quantitykind/"),
  xsd: namespace("http://www.w3.org/2001/XMLSchema#"),
};

//CREATE STARTING ARRAYS
export const queriedElements = [
  "IfcBuildingElement",
  "IfcDistributionElement",
  "IfcFurnishingElement",
  "IfcElementComponent",
  "IfcOpeningElement",
  "IfcSpatialElement",
  "IfcElementAssembly"
];

export const ifcToDiscreteObjectArray = [
  "IfcBuildingElement",
  "IfcDistributionElement",
  "IfcFurnishingElement",
  "IfcElementComponent",
  "IfcElementAssembly"
];

//SPARQL QUERIES
export async function PredefinedTypeEnumerationQuery(superclass) {
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
  SELECT DISTINCT ?subObject ?directParent ?enum ?o ?type
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
      ?enum ?p ?o .
            ?subObjectEnumType rdfs:subClassOf expr:ENUMERATION .
      
          
            FILTER(?enum != ifc:NOTDEFINED)
            FILTER(?enum != ifc:USERDEFINED)
            FILTER( regex(str(?o), "TypeEnum", "i") )
      
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

export async function ifcRootAttributeQuery(superclass) {
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
  SELECT DISTINCT ?subObject ?attribute ?upAtt
    WHERE { 
         ?subObject rdfs:subClassOf* ifc:IfcRoot .
        
   
   		?attribute rdfs:domain ?subObject .
        ?attribute rdfs:range ?upAtt .
        ?upAtt rdfs:subClassOf ?upperClass .
 
    FILTER( !regex(str(?upperClass), "node", "i") )
    FILTER NOT EXISTS {
         ?upAtt rdfs:subClassOf*  ifc:IfcRelationship.
    }
    FILTER EXISTS {
         ifc:${superclass} rdfs:subClassOf*  ?subObject.
    }
    FILTER( !regex(str(?attribute), "predefinedType", "i"))
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

export async function belowAttributesNoEnumerationsQuery() {
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
    SELECT DISTINCT ?subObject ?attribute ?upAtt
      WHERE { 
           ?subObject rdfs:subClassOf* ifc:IfcElement .
           ?subObject rdfs:subClassOf ?directParent .
          ?directParent a ?type
        FILTER ( ?type != owl:Restriction)
          FILTER( !regex(str(?directParent), "node", "i") )
           OPTIONAL {
              ?predefinedTypeRelation rdfs:domain ?subObject ;
                                                       rdfs:range ?subObjectEnumType .
              ?enum rdf:type ?subObjectEnumType .
              ?subObjectEnumType rdfs:subClassOf expr:ENUMERATION .
      }
             ?attribute rdfs:domain ?subObject .
      ?attribute rdfs:range ?upAtt .
      ?upAtt rdfs:subClassOf ?upperClass .
          FILTER( !regex(str(?upperClass), "node", "i") )
      FILTER NOT EXISTS {
           ?upAtt rdfs:subClassOf*  ifc:IfcRelationship.
      }
      
      FILTER( !regex(str(?upAtt), "Enum", "i")) }
  
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

export async function enumerationAttributeQuery() {
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
        SELECT DISTINCT ?subObject ?attribute ?upAtt ?enum
          WHERE { 
               ?subObject rdfs:subClassOf* ifc:IfcElement .
               ?subObject rdfs:subClassOf ?directParent .
              ?directParent a ?type
            FILTER ( ?type != owl:Restriction)
              FILTER( !regex(str(?directParent), "node", "i") )
               OPTIONAL {
                  ?predefinedTypeRelation rdfs:domain ?subObject ;
                          rdfs:range ?subObjectEnumType .
                  ?enum rdf:type ?subObjectEnumType .
                  ?subObjectEnumType rdfs:subClassOf expr:ENUMERATION .
          }
                 ?attribute rdfs:domain ?subObject .
          ?attribute rdfs:range ?upAtt .
          ?upAtt rdfs:subClassOf ?upperClass .
          
              FILTER( !regex(str(?upperClass), "node", "i") )
              FILTER NOT EXISTS {
               ?upAtt rdfs:subClassOf*  ifc:IfcRelationship.
          }
          
      
            FILTER( !regex(str(?attribute), "predefinedType", "i")) 
           ?upAtt ?s ?o
          FILTER EXISTS {?upAtt rdfs:subClassOf expr:ENUMERATION .}
        
          ?enum rdf:type ?upAtt
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

export async function classAtrributeEnumerationQuery() {
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
        SELECT DISTINCT ?subObject ?upAtt ?attribute
          WHERE { 
               ?subObject rdfs:subClassOf* ifc:IfcElement .
               ?subObject rdfs:subClassOf ?directParent .
              ?directParent a ?type
            FILTER ( ?type != owl:Restriction)
              FILTER( !regex(str(?directParent), "node", "i") )
               OPTIONAL {
                  ?predefinedTypeRelation rdfs:domain ?subObject ;
                          rdfs:range ?subObjectEnumType .
                  ?enum rdf:type ?subObjectEnumType .
                  ?subObjectEnumType rdfs:subClassOf expr:ENUMERATION .
          }
                 ?attribute rdfs:domain ?subObject .
          ?attribute rdfs:range ?upAtt .
          ?upAtt rdfs:subClassOf ?upperClass .
          
              FILTER( !regex(str(?upperClass), "node", "i") )
              FILTER NOT EXISTS {
               ?upAtt rdfs:subClassOf*  ifc:IfcRelationship.
          }
          
      
            FILTER( !regex(str(?attribute), "predefinedType", "i")) 
           ?upAtt ?s ?o
          FILTER EXISTS {?upAtt rdfs:subClassOf expr:ENUMERATION .}
        
          ?enum rdf:type ?upAtt
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

export async function fullEnumerationsInAttributesQuery(IfcClass) {
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
        SELECT DISTINCT ?subObject ?attribute ?upAtt ?enum
          WHERE { 
               ?subObject rdfs:subClassOf* ifc:IfcElement .
               ?subObject rdfs:subClassOf ?directParent .
              ?directParent a ?type
            FILTER ( ?type != owl:Restriction)
              FILTER( !regex(str(?directParent), "node", "i") )
               OPTIONAL {
                  ?predefinedTypeRelation rdfs:domain ?subObject ;
                          rdfs:range ?subObjectEnumType .
                  ?enum rdf:type ?subObjectEnumType .
                  ?subObjectEnumType rdfs:subClassOf expr:ENUMERATION .
          }
                 ?attribute rdfs:domain ?subObject .
          ?attribute rdfs:range ?upAtt .
          ?upAtt rdfs:subClassOf ?upperClass .
          
              FILTER( !regex(str(?upperClass), "node", "i") )
              FILTER NOT EXISTS {
               ?upAtt rdfs:subClassOf*  ifc:IfcRelationship.
          }
          
      
            FILTER( !regex(str(?attribute), "predefinedType", "i")) 
           ?upAtt ?s ?o
          FILTER EXISTS {?upAtt rdfs:subClassOf expr:ENUMERATION .}
        
            FILTER( regex(str(?attribute), "${IfcClass}", "i")) 	
        
          ?enum rdf:type ?upAtt
       
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

// CONSOLE LOG
async function logGraph() {
  await logicFunction(queriedElements);
  for (const quad of otlGraph.dataset) {
    console.log(
      `${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`
    );
  }
}

export function upperCaseFirst(str) {
  return str.charAt(0).toUpperCase() + str.substring(1);
}


//CREATE NODES

// CREATE THE NODES FOR THE TAXONOMY
export function createEnumerationClassNode(subject, object) {
  const prefLabel = otlGraph.literal(
    _.startCase(`${object}`) + " " + _.startCase(`${subject}`),
    "en"
  );
  const subjectNode = ns.otl[`${object}-${subject}`];
  const otlObjectNode = ns.otl[`${object}`];
  const ifcEnNode = ns.ifc[`${subject}`];
  otlGraph
    .namedNode(subjectNode)
    .addOut(otlGraph.namedNode(rdff.type), otlGraph.namedNode(owl.Class))
    .addOut(
      otlGraph.namedNode(rdfs.subClassOf),
      otlGraph.namedNode(otlObjectNode)
    )
    .addOut(otlGraph.namedNode(rdfs.seeAlso), otlGraph.namedNode(ifcEnNode))
    .addOut(otlGraph.namedNode(skos.prefLabel), prefLabel);
}


export function createIfcEntityClassNode(subject, nenEntity) {
  const prefLabel = otlGraph.literal(_.startCase(`${subject.slice(3)}`), "en");
  const subjectNode = ns.otl[`${subject.slice(3)}`];
  const ifcClassNode = ns.ifc[`${subject}`];

  createNode(subjectNode, rdff.type, owl.Class)
  createNode(subjectNode, rdfs.subClassOf, nenEntity)
  createNode(subjectNode, rdfs.subClassOf, ifcClassNode)
  createNode(subjectNode, rdfs.subClassOf, prefLabel)
}

// CREATE THE NODES FOR THE ATTRIBUTES

export function createNode(subject, predicate, object) {
  otlGraph
    .namedNode(subject)
    .addOut(otlGraph.namedNode(predicate), otlGraph.namedNode(object));
}

export function createGenericNodeOTLObject(subject, predicate, object) {
  const objectNode = ns.otl[`${object}`];
  otlGraph
    .namedNode(subject)
    .addOut(otlGraph.namedNode(predicate), otlGraph.namedNode(objectNode));
}
export function createGenericNodeOTLSubjectAndObject(subject, predicate, object) {
  const subjectNode = ns.otl[`${subject}`];
  const objectNode = ns.otl[`${object}`];
  otlGraph
    .namedNode(subjectNode)
    .addOut(otlGraph.namedNode(predicate), otlGraph.namedNode(objectNode));
}

export function createSimpleQuantityNode(subject) {
  const subjectNode = ns.otl[`${subject}`];
  otlGraph
    .namedNode(subjectNode)
    .addOut(otlGraph.namedNode(rdff.type), owl.DatatypeProperty);
}

export function createComplexQuantityNode(subject, measure) {
  const subjectNode = ns.otl[`${subject}`];
  const quantityKind = ns.quantitykind[`${measure}`];

  createNode(subjectNode, rdff.type, owl.ObjectProperty);
  createNode(subjectNode, ns.nen2660.hasQuantityKind, quantityKind);
  createNode(subjectNode, rdfs.range, ns.nen2660.QuantityValue);
}

export function createPropertyShape(ifcClass, attribute) {
  const subjectNode = ns.otl[`${attribute}-${ifcClass}`];
  const otlAttribute = ns.otl[`${attribute}`];
  otlGraph
    .namedNode(subjectNode)
    .addOut(
      otlGraph.namedNode(rdff.type),
      otlGraph.namedNode(ns.sh.PropertyShape)
    )
    .addOut(otlGraph.namedNode(ns.sh.path), otlAttribute);
}