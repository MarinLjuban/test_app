//IMPORT DEPENDENCIES
import * as fs from "fs";
import namespace from "@rdfjs/namespace";
import SparqlClient from "sparql-http-client";
import cf from "clownface";
import rdf from "rdf-ext";
import { create } from "domain";
import toFile from "rdf-utils-fs";
import { readFileSync } from "fs";

//CREATE THE NAMESPACES
// const ifc = namespace('http://ifcowl.openbimstandards.org/IFC4_ADD2#');
// const otl = namespace('https://otl.buildingsmart.org/IFC4_ADD2_TC1/def/');

//CREATE LOCAL SPARQL ENDPOINT
const client = new SparqlClient({
  endpointUrl: "http://DESKTOP-SQ747CJ:7200/repositories/Ifc4Test",
});

//CREATE GRAPH
const otl = cf({ dataset: rdf.dataset() });

//CREATE THE ARRAY OF FIRST ITEMS TO BE QUERIED
const queriedElements = [
  "BuildingElement",
  "DistributionElement",
  "FurnishingElement",
  "ElementComponent",
];

//CREATE THE FUNCTION FOR SPARQL QUERY OF CLASSES
async function subclassQuery(superclass) {
  const classStream = await client.query.select(`
  PREFIX nen2660: <https://w3id.org/nen2660/def#>
  PREFIX ifc: <http://ifcowl.openbimstandards.org/IFC4_ADD2#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX expr: <https://w3id.org/express#>
  PREFIX zh: <https://w3id.org/ziekenhuis/def#>
  PREFIX owl: <http://www.w3.org/2002/07/owl#>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

  SELECT ?directSub
  WHERE { ?directSub rdfs:subClassOf ifc:Ifc${superclass} 
  }
  `);

  //RETURN AN ARRAY OF OBJECTS WITH THE QUERY RESULTS
  let classArray = [];

  return new Promise((resolve) => {
    classStream
      .on("data", (row) => {
        classArray.push(row.directSub.value.slice(48));
      })
      .on("end", () => {
        resolve(classArray);
      });
  });
}

//CREATE THE FUNCTION FOR SPARQL QUERY OF ENUMERATIONS
async function enumQuery(superclass) {
  //DEFINE SPARQL QUERY
  const enumStream = await client.query.select(`
  PREFIX nen2660: <https://w3id.org/nen2660/def#>
  PREFIX ifc: <http://ifcowl.openbimstandards.org/IFC4_ADD2#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX expr: <https://w3id.org/express#>
  PREFIX zh: <https://w3id.org/ziekenhuis/def#>
  PREFIX owl: <http://www.w3.org/2002/07/owl#>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
  select ?enumtype ?enum where { 
  ?enum		 rdf:type ?enumtype .
      ?enumtype	?p expr:ENUMERATION .
      
      FILTER (?enumtype = ifc:Ifc${superclass}TypeEnum)
      FILTER (?p = rdfs:subClassOf)
      FILTER(?enum != ifc:NOTDEFINED)
      FILTER(?enum != ifc:USERDEFINED)

  } limit 2000
  `);

  //RETURN AN ARRAY OF OBJECTS WITH THE QUERY RESULTS
  let enumArray = [];
  return new Promise((resolve) => {
    enumStream
      .on("data", (row) => {
        enumArray.push(row.enum.value.slice(45));
      })
      .on("end", () => {
        resolve(enumArray);
      });
  });
}

//LOGIC FUNCTION
async function logicFunction(queried) {
  for (const item of queried) {
    let foundItems = await subclassQuery(item);
    if (foundItems.length > 0) {
      // console.log(foundItems);
      await logicFunction(foundItems);
    } else {
      let enumItems = await enumQuery(item);
      if (enumItems.length > 0) {
        // console.log(enumItems);
        for (const enumeration of enumItems) {
          await createNode(enumeration, item);
        }

        // console.log(enumeration);
      }
    }
  }
  return otl;
}
// }

// logicFunction(queriedElements);

function createNode(enumeration, item) {
  otl
    .namedNode(`otl:${enumeration}`)
    .addOut("a", "owl:Class")
    .addOut("rdfs:subClassOf", `otl:${item}`);
}

async function logGraph() {
  const graphLog = await logicFunction(queriedElements);

  for (const quad of otl.dataset) {
    console.log(
      `${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`
    );
  }
}

logGraph();

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
  SELECT DISTINCT ?subObject ?directParent ?enum
    WHERE { 
         ?subObject rdfs:subClassOf* ifc:IfcDistributionElement .
         ?subObject rdfs:subClassOf ?directParent .
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

  //RETURN AN ARRAY OF OBJECTS WITH THE QUERY RESULTS
  let classArray = [];

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

async function fullLogicFunction(queried) {
  for (const item of queried) {
    let foundItems = await fullQuery(item);
    for (const item of foundItems) {
      if (item.subObject.value) {
        console.log(item.directParent);
      }
    }
  }
}

// fullLogicFunction(queriedElements);

// await toFile(otl.toStream(), 'test.ttl');

// console.log(readFileSync('test.ttl').toString());
