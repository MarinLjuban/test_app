//Import dependencies
import * as fs from 'fs';
import namespace from '@rdfjs/namespace';
import SparqlClient from 'sparql-http-client'

//Create the namespace object
const ns = {
  schema: namespace('http://schema.org/'),
  rdf: namespace('http://www.w3.org/1999/02/22-rdf-syntax-ns#'),
  bot: namespace('https://w3id.org/bot#')
};


//Get the data from local endpoint
const client = new SparqlClient({ endpointUrl: 'http://DESKTOP-SQ747CJ:7200/repositories/IFC4_ADD2_RDF' })

//Create the SPARQL Query
const stream = await client.query.select(`
PREFIX nen2660: <https://w3id.org/nen2660/def#>
PREFIX ifc: <http://ifcowl.openbimstandards.org/IFC4_ADD2#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX expr: <https://w3id.org/express#>
PREFIX zh: <https://w3id.org/ziekenhuis/def#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
select DISTINCT ?enumtype where { 
?enum		 rdf:type ?enumtype .
    ?enumtype	?p expr:ENUMERATION .
    
    FILTER (?p = rdfs:subClassOf)
    FILTER(?enum != ifc:NOTDEFINED)
    FILTER(?enum != ifc:USERDEFINED)

} limit 2000

`)


//Write the data to console
stream.on('data', row => {
  console.log(row)
})


