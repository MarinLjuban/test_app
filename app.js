//IMPORT DEPENDENCIES
import * as fs from 'fs';
import namespace from '@rdfjs/namespace';
import SparqlClient from 'sparql-http-client';
import cf from 'clownface';
import rdf from 'rdf-ext';

//CREATE THE NAMESPACES
// const ifc4 = namespace('http://ifcowl.openbimstandards.org/IFC4_ADD2#');
// const otl = namespace('https://otl.buildingsmart.org/IFC4_ADD2_TC1/def/');

//CREATE LOCAL SPARQL ENDPOINT
const client = new SparqlClient({ endpointUrl: 'http://DESKTOP-SQ747CJ:7200/repositories/Ifc4Test' })


//CREATE THE ARRAY OF FIRST ITEMS TO BE QUERIED
const queriedElements = ['BuildingElement', 'DistributionElement', 'FurnishingElement', 'ElementComponent'];

//CREATE THE SPARQL SUBCLASS QUERY
 async function subclassQuery(superclass) {
  const classStream = await client.query.select(`
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
  //CREATE AN ARRAY OF OBJECTS WITH THE QUERY RESULTS - THIS DOES NOT WORK!!!!!!
  let classArray = [];

  return new Promise(resolve => {
    classStream.on('data', (row) => {
      classArray.push(row.directSub.value.slice(48));
    })
    .on('end', () => {
      resolve (classArray);
    });
})
}


//CREATE THE SPARQL ENUM QUERY
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

  let enumArray = []
  //CREATE AN ARRAY OF OBJECTS WITH THE QUERY RESULTS - THIS DOES NOT WORK!!!!!!

  return new Promise(resolve => {
    enumStream.on('data', (row) => {
      enumArray.push(row.enum.value.slice(45));
    })
    .on('end', () => {
      resolve (enumArray);
    });
})
}


// const query = await subclassQuery('BuildingElement');
// console.log(query);

// subclassQuery('BuildingElement').then((enumArray) => {
//   console.log(enumArray);
// }).catch((error) => {
//   console.error(error);
// });



//LOGIC FUNCTION
async function logicFunction(queried) {
  // remove empty arrays from queried

  for (const item of queried) {
    let foundItems = await subclassQuery(item);
    foundItems = foundItems.filter(Boolean);
    console.log(foundItems);
    if (foundItems.length > 0) {
      await logicFunction(foundItems);
    } else {
      let enumItems = await enumQuery(item);
      enumItems = enumItems.filter(Boolean);
      console.log(enumItems);
    }
  }
}

logicFunction(queriedElements);



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


// subclassQuery(`${queriedElement}`);
// enumQuery(`${queriedElement}`);
