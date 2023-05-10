import namespace from "@rdfjs/namespace";
import SparqlClient from "sparql-http-client";
import cf from "clownface";
import rdf from "rdf-ext";
import toFile from "rdf-utils-fs/toFile.js";
import _ from "lodash";





//CREATE THE NAMESPACES
const ns = {
    ifc: namespace('http://ifcowl.openbimstandards.org/IFC4_ADD2#'),
    rdf: namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
    otl: namespace('https://otl.buildingsmart.org/IFC4_ADD2_TC1/def/'),
    owl: namespace('http://www.w3.org/2002/07/owl#')
  }

//CREATE LOCAL SPARQL ENDPOINT
const client = new SparqlClient({
  endpointUrl: "http://DESKTOP-SQ747CJ:7200/repositories/Ifc4Test",
});

//CREATE GRAPH
const otlGraph = cf({ dataset: rdf.dataset() });

//CREATE THE ARRAYS FOR QUERYING AND MAPPING
const queriedElements = [
  "BuildingElement",
  "DistributionElement",
  "FurnishingElement",
  "ElementComponent",
  "SpatialElement",
];

const IfcToDiscreteObjectArray = [
  "BuildingElement",
  "DistributionElement",
  "FurnishingElement",
  "ElementComponent",

];//CREATE QUERY
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
         ?subObject rdfs:subClassOf* ifc:Ifc${superclass} .
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
};


//CREATE THE NODES
function createNodeEnum(subject, object) {
  otlGraph
    .namedNode(`otl:${object}-${subject}`)
    .addOut(otlGraph.namedNode("a"),otlGraph.namedNode("owl:Class"))
    .addOut(otlGraph.namedNode("owl:subClassOf"), otlGraph.namedNode(`otl:${object}`))
    .addOut(otlGraph.namedNode("rdfs:seeAlso"), otlGraph.namedNode(`ifc:${subject}`))
    .addOut(otlGraph.namedNode("skos:prefLabel"), `${object} ${subject}`);
}

function createNodeClass(subject, nenEntity) {
  otlGraph
    .namedNode(`otl:${subject}`)
    .addOut(otlGraph.namedNode("a"), otlGraph.namedNode("owl:Class"))
    .addOut(otlGraph.namedNode("rdfs:subClassOf"), otlGraph.namedNode(`${nenEntity}`))
    .addOut(otlGraph.namedNode("rdfs:seeAlso"), otlGraph.namedNode(`ifc:Ifc${subject}`))
    .addOut(otlGraph.namedNode("skos:prefLabel"), `${subject}`);
}

//CONSOLE LOG
async function logGraph() {
  const graphLog = await logicFunction(queriedElements);
  for (const quad of otlGraph.dataset) {
    console.log(
      `${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`
    );
  }
}

//OPERATING - LOGIC FUNCTION
async function logicFunction(queried) {
  for (const item of queried) {
    if (IfcToDiscreteObjectArray.includes(item)) {
      let foundItems = await fullQuery(item);
      for (const item of foundItems) {
        if (item.enum?.value != undefined) {
          createNodeEnum(
            item.enum?.value.slice(45),
            item.subObject?.value.slice(48)
          );
          createNodeClass(
            item.subObject?.value.slice(48),
            "nen2660:DiscreteObject"
          );
        }
      }
    } else {
      let foundItems = await fullQuery(item);
      for (const item of foundItems) {
        if (item.enum?.value != undefined) {
          createNodeEnum(
            item.enum?.value.slice(45),
            item.subObject?.value.slice(48)
          );
          createNodeClass(
            item.subObject?.value.slice(48),
            "nen2660:SpatialRegion"
          );
        }
      }
    }
  }
}

//RUN
async function runProgram() {
  await logicFunction(queriedElements);
  await logGraph();
  await toFile(otlGraph.dataset.toStream(), "test.ttl");
  await toFile(otlGraph.dataset.toStream(), "test.jsonld");
}

runProgram();


