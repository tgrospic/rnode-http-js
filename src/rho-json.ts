import * as R from 'ramda'

// Converts RhoExpr response from RNode WebAPI
// https://github.com/rchain/rchain/blob/b7331ae05/node/src/main/scala/coop/rchain/node/api/WebApi.scala#L128-L147
// - return!("One argument")   // monadic
// - return!((true, A, B))     // monadic as tuple
// - return!(true, A, B)       // polyadic
// new return(`rho:rchain:deployId`) in {
//   return!((true, "Hello from blockchain!"))
// }
// TODO: make it stack safe
export const rhoExprToJson = (input: any) => {
  const loop = (rhoExpr: any) => convert(rhoExpr)(converters)
  const converters = R.toPairs(converterMapping(loop))
  return loop(input)
}

const converterMapping = (loop: any) => ({
  "ExprInt": R.identity,
  "ExprBool": R.identity,
  "ExprString": R.identity,
  "ExprBytes": R.identity,
  "ExprUri": R.identity,
  "UnforgDeploy": R.identity,
  "UnforgDeployer": R.identity,
  "UnforgPrivate": R.identity,
  "ExprUnforg": loop,
  "ExprPar": R.map(loop),
  "ExprTuple": R.map(loop),
  "ExprList": R.map(loop),
  "ExprSet": R.map(loop),
  "ExprMap": R.mapObjIndexed(loop),
})

const convert = (rhoExpr: any) => R.pipe(
  R.map(matchTypeConverter(rhoExpr)),
  R.find(x => !R.isNil(x)),
  // Return the whole object if unknown type
  x => R.isNil(x) ? [R.identity, rhoExpr] : x,
  ([f, d]) => f(d)
)

const matchTypeConverter = (rhoExpr: any) => ([type, f]: [string, any]) => {
  const d = R.path([type, 'data'], rhoExpr)
  return R.isNil(d) ? void 666 : [f, d]
}
