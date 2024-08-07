//Inital version of REVIEW query
export const REVIEW = `query Query($where: SchemaWhereUniqueInput!, 
$attestationsWhere2: AttestationWhereInput) {
  schema(where: $where) {
    attestations(where: $attestationsWhere2) {
      data
    }
  }
}`;
