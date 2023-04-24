//IMPORT DEPENDENCIES
import * as fs from 'fs';
import namespace from '@rdfjs/namespace';
import SparqlClient from 'sparql-http-client';
import cf from 'clownface';
import rdf from 'rdf-ext';

//CREATE THE NAMESPACES
const ifc4 = namespace('http://ifcowl.openbimstandards.org/IFC4_ADD2#');
// const otl = namespace('https://otl.buildingsmart.org/IFC4_ADD2_TC1/def/');

//GET THE DATA FROM LOCAL ENDPOINT
const client = new SparqlClient({ endpointUrl: 'http://DESKTOP-SQ747CJ:7200/repositories/Ifc4Test' })



const queriedElement = 'Sensor'
//CREATE THE SPARQL QUERIES
async function subclassQuery(superclass) {
  const stream = await client.query.select(`
  PREFIX nen2660: <https://w3id.org/nen2660/def#>
  PREFIX ifc4: <http://ifcowl.openbimstandards.org/IFC4_ADD2#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  PREFIX expr: <https://w3id.org/express#>
  PREFIX zh: <https://w3id.org/ziekenhuis/def#>
  PREFIX owl: <http://www.w3.org/2002/07/owl#>
  PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

  PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

  SELECT ?directSub
  WHERE { ?directSub rdfs:subClassOf ifc4:Ifc${superclass} 
  }

  `)
  //CREATE AN ARRAY OF OBJECTS WITH THE QUERY RESULTS - OVO MI TREBA
  stream.on('data', row => {
    console.log(row.directSub.value.slice(48));
  });
}


async function enumQuery(superclass) {
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


  `)


  //CREATE AN ARRAY OF OBJECTS WITH THE QUERY RESULTS - OVO MI TREBA
 enumStream.on('data', row => {
    console.log(row.enum.value.slice(45));
  })
}







// //FUNCTION FOR GRAPH CREATION
// const otl = cf({ dataset: rdf.dataset() });

// otl
// .namedNode(`otl:${queriedElement}`)
// .addOut('a', 'owl:Class')
// .addOut('rdfs:subClassOf', 'otl:BuildingElement');

// for (const quad of otl.dataset) {
//   console.log(`${quad.subject.value} ${quad.predicate.value} ${quad.object.value}`)
// }

// console.log(subclassQuery(queriedElement)); 
// console.log(enumQuery(queriedElement)); 


//Create the logic function
// async function sparqlQuery(queriedItem) {
  
//   subclassQuery(queriedItem);

//   enumQuery(queriedItem);

//   }

//   sparqlQuery('Window');


subclassQuery(`${queriedElement}`);
enumQuery(`${queriedElement}`);
