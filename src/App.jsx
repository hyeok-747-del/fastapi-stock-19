import { useEffect, useState } from 'react'
import './App.css'

const format = (value) => Number.isFinite(value) ? value.toLocaleString('ko-KR') : '—'
const percent = (value) => Number.isFinite(value) ? `${value > 0 ? '+' : ''}${(value * 100).toFixed(2)}%` : '—'
const direction = (value) => value > 0 ? 'up' : value < 0 ? 'down' : ''

function App() {
  const [stock, setStock] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await fetch('/api/samsung', { signal: controller.signal })
        if (!response.ok) throw new Error(`서버 응답 오류 (${response.status})`)
        const payload = await response.json()
        if (!Array.isArray(payload.data) || !payload.data.every((row) =>
          row && typeof row.Date === 'string' && Number.isFinite(Date.parse(row.Date)) &&
          ['Open', 'High', 'Low', 'Close', 'Volume', 'Change'].every((key) => Number.isFinite(row[key]))
        )) throw new Error('서버 데이터 형식이 올바르지 않습니다.')
        setStock({ ...payload, data: [...payload.data].sort((a, b) => a.Date.localeCompare(b.Date)) })
      } catch (err) {
        if (err.name !== 'AbortError') setError(`${err.message} FastAPI 서버(localhost:8000)를 확인하고 다시 시도해 주세요.`)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [refresh])

  const rows = stock?.data ?? []
  const latest = rows.at(-1)
  const min = rows.length ? Math.min(...rows.map((row) => row.Close)) : 0
  const max = rows.length ? Math.max(...rows.map((row) => row.Close)) : 0
  const points = rows.map((row, i) => `${20 + i / Math.max(rows.length - 1, 1) * 760},${190 - (row.Close - min) / (max - min || 1) * 160}`).join(' ')

  return (
    <main>
      <header>
        <div><p className="eyebrow">STOCK OVERVIEW · {stock?.code || '005930'}</p><h1>{stock?.name || '삼성전자'}</h1><p className="muted">최근 30일 주가 현황 · 거래일 기준</p></div>
        <button onClick={() => setRefresh((value) => value + 1)} disabled={loading}>{loading ? '불러오는 중…' : '새로고침'}</button>
      </header>
      <div aria-live="polite" aria-busy={loading}>
        {loading && <p className="panel" role="status">최근 주가 데이터를 불러오고 있습니다.</p>}
        {error && <p className="panel error" role="alert">{error}</p>}
        {!loading && !error && !latest && <p className="panel">조회된 거래 데이터가 없습니다.</p>}
        {!loading && !error && latest && <>
          <section className="summary" aria-label="최근 거래일 요약">
            <article className="panel"><p className="muted">최근 종가 · {latest.Date}</p><strong>{format(latest.Close)}<small> 원</small></strong><p className={direction(latest.Change)}>전일 대비 {percent(latest.Change)}</p></article>
            <article className="panel"><p className="muted">기간 최고가</p><strong>{format(Math.max(...rows.map((row) => row.High)))}<small> 원</small></strong><p className="muted">조회 기간 내 장중 최고</p></article>
            <article className="panel"><p className="muted">최근 거래량</p><strong>{format(latest.Volume)}<small> 주</small></strong><p className="muted">총 {rows.length}개 거래일 조회</p></article>
          </section>
          <section className="panel chart">
            <div className="section-heading"><h2>종가 추이</h2><span className="muted">최저 {format(min)}원 / 최고 {format(max)}원</span></div>
            <svg viewBox="0 0 800 220" role="img" aria-label={`${rows[0].Date}부터 ${latest.Date}까지 종가 추이`}>
              <line x1="20" y1="190" x2="780" y2="190" stroke="#e4e9f2" />
              <polyline points={points} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
              {rows.map((row, i) => <circle key={row.Date} cx={20 + i / Math.max(rows.length - 1, 1) * 760} cy={190 - (row.Close - min) / (max - min || 1) * 160} r="4" fill="#2563eb"><title>{row.Date}: {format(row.Close)}원</title></circle>)}
            </svg>
            <div className="section-heading muted"><span>{rows[0].Date}</span><span>{latest.Date}</span></div>
          </section>
          <section className="panel">
            <div className="section-heading"><h2>일별 시세</h2><span className="muted">{rows[0].Date} ~ {latest.Date} · 최신순</span></div>
            <div className="table-scroll"><table><caption>가격 단위: 원 · 거래량 단위: 주 · 휴장일 제외</caption><thead><tr>{['날짜', '시가', '고가', '저가', '종가', '등락률', '거래량'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead><tbody>
              {[...rows].reverse().map((row) => <tr key={row.Date}><th scope="row">{row.Date}</th><td>{format(row.Open)}</td><td>{format(row.High)}</td><td>{format(row.Low)}</td><td className="close">{format(row.Close)}</td><td className={direction(row.Change)}>{percent(row.Change)}</td><td>{format(row.Volume)}</td></tr>)}
            </tbody></table></div>
          </section>
        </>}
      </div>
    </main>
  )
}
export default App
