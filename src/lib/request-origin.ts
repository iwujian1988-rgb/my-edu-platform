type OriginRequest = {url:string; headers:Headers}

/** Next may expose the upstream localhost URL behind the platform's HTTPS proxy. */
export function requestOrigin(request:OriginRequest):string {
  const internal=new URL(request.url)
  const forwarded=request.headers.get('x-forwarded-proto')?.split(',')[0].trim()
  const protocol=forwarded==='https'||forwarded==='http'?`${forwarded}:`:internal.protocol
  const host=request.headers.get('host')||internal.host
  try {
    const external=new URL(`${protocol}//${host}`)
    if(external.username||external.password||external.pathname!=='/'||external.search||external.hash) return internal.origin
    return external.origin
  } catch {return internal.origin}
}

export function isSameOriginRequest(request:OriginRequest):boolean {
  return request.headers.get('origin')===requestOrigin(request)
}
