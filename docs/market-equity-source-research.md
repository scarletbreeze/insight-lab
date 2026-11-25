# Market Time Capsule 종목 수익률 자료 조사

한국·미국 시장별로 월 첫 거래일의 모집단을 정하고, 첫 거래일과 마지막 거래일의 분할 조정 종가를 연결한다. 공개된 기간은 종목 순위 산정 화면에서 확인할 수 있다. 한국의 첫 검증 대상 월은 2024년 12월이다.

## 한국

- [KRX 지수구성종목](https://data.krx.co.kr/contents/MDC/STAT/standard/MDCSTAT006.jsp)에서 KOSPI 200과 KOSDAQ 150의 과거 기준일 구성종목 내보내기를 확인한다.
- [KRX 전종목 시세](https://data.krx.co.kr/contents/MDC/MDI/outerLoader/index.cmd?screenId=MDCSTAT015)에서 해당 거래일의 원시 종가를 대조한다. 순위 계산에는 분할 등 기업행동을 반영한 동일 기준 가격이 필요하다.
- 출처와 공개 활용 범위를 확인한 자료를 두 개의 CSV로 정리한다. 구성종목에는 `symbol,name,index,as_of,membership_source_url`을 기록하고, 가격에는 `symbol,first_date,last_date,first_adjusted_close,last_adjusted_close,source_url,exclusion_reason`을 기록한다. 종목코드는 여섯 자리로 유지한다. 가격 확인이 불가능한 구성종목도 출처와 제외 사유가 담긴 행을 남긴다.
- 2024년 12월 정기변경 전에는 분할 신설회사 수시 편입으로 코스피200이 201종목이었다. [삼성증권 정기변경 자료](https://www.samsungpop.com/common.do?cmd=down&contentType=application%2Fpdf&fileName=1040%2F2024112117515023K_02_02.pdf&inlineYn=Y&saveKey=research.pdf)에 따르면 12월 13일 4종목 편입·5종목 편출로 200종목으로 돌아갔다. 아래는 정기변경 전인 12월 첫 거래일을 기준으로 한다. 입력 검증을 통과하면 같은 기간의 `KR` 순위만 반영한다.

```sh
python3 scripts/market/join_krx_prices.py members.csv adjusted-closes.csv \
  --first 2024-12-02 --last 2024-12-30 --kospi-count 201 --out data/market/months/equity-rankings.json
```

## 미국

### 2016~2018 WIKI/PRICES

- 2015년 10월~2018년 2월 29개월과 2016~2017년 연간 순위를 수록했다. 모집단은 QQQ의 [2015년 9월 말](https://www.sec.gov/Archives/edgar/data/1067839/000119312516441831/d106822d485bpos.htm), [2016년 9월 말](https://www.sec.gov/Archives/edgar/data/1067839/000119312516806695/d272217dn30b2.htm), [2017년 9월 말](https://www.sec.gov/Archives/edgar/data/1067839/000119312518001208/d432220dn30b2.htm) 보유 명세를 기준으로 한다. 중간 시점은 `data/market/qqq-index-changes.json`의 기준일별 변경을 반영한다. 2015년 9월 명세에서 출발해 변경을 반영한 2016년 9월의 105종목은 해당 시점 QQQ 보유 명세와 일치한다. 2016년 12월에는 [Nasdaq 연간 평가](https://indexes.nasdaqomx.com/docs/NDX100_AnnualEvaluation.pdf)에 기록된 LiLAC 두 종류를 포함한다. 결과에는 사용한 보유 명세와 근사 모집단이라는 기준을 표시한다.
- 2016년 4월 Liberty Media의 추적주 재편은 단순 분할로 처리할 수 없어 해당 월과 연간 순위에서 이전 주식 두 종류를 제외했다. 출처와 종목은 `data/market/qqq-complex-actions.json`에 기록한다.
- [Nasdaq Data Link WIKI](https://data.nasdaq.com/databases/WIKIP)는 2018년 3월 27일에 자료가 종료된 공개 도메인 아카이브다. 가격 파일은 [공개 미러](https://www.kaggle.com/datasets/marketneutral/quandl-wiki-prices-us-equites)에서 확보했다. 첫 종가를 이후 기간의 분할 비율로 조정한다. 배당은 제외한다.
- 거래일은 AAPL·MSFT·GOOG 시세의 관측일을 합쳐 대조한다. 관측일과 분할 자료를 모두 갖춘 종목만 계산한다. 2018년 2월 PCLN은 [BKNG로 변경](https://ir.bookingholdings.com/news/news-details/2018/The-Priceline-Group-Inc--NASDAQ-PCLN-Announces-Name-Change-to-Booking-Holdings-Inc--02-21-2018/default.aspx)됐으며 해당 아카이브에서 변경 후 종가를 찾지 못해 제외했다.

```sh
python3 scripts/market/rank_wiki_portfolio.py WIKI_PRICES.zip data/market/qqq-holdings-2017-09.json \
  --first 2017-10-02 --last 2017-10-31 \
  --accept-missing CTRP JD LBTYK LILA LILAK MELI NTES QVCA SHPG
```

아카이브는 ZIP, gzip 또는 CSV로 입력할 수 있다. 스크립트가 보고한 누락 종목을 원자료에서 확인한 뒤 `--accept-missing`으로 명시한다. 연간 집계에는 `--annual`을 추가한다.
중간 편입과 제외를 반영하려면 `--changes data/market/qqq-index-changes.json`을 전달한다. 가격 기간 안의 복합 기업행동을 반영하려면 `--actions data/market/qqq-complex-actions.json`을 추가한다.

### S&P 500 추종 펀드 (SPY)

- 2016년 10월~2018년 2월 월간 17개월과 2017년 연간 순위를 수록했다. 모집단은 [2016년 9월 말](https://www.sec.gov/Archives/edgar/data/884394/000119312516777823/d235904dn30d.htm), [2017년 3월 말](https://www.sec.gov/Archives/edgar/data/884394/000119312517183633/d280941dn30d.htm), [2017년 9월 말](https://www.sec.gov/Archives/edgar/data/884394/000119312517355427/d418234dn30d.htm) SPY 보유 명세에서 가져왔다. 공시의 주식 행을 추출했을 때 각 명세의 평가액 합계와 일치한다.
- WIKI 종목명과 명세의 이름을 대조하고, 명세의 평가액을 주식 수로 나눈 값과 WIKI 기준일 종가를 이용해 종목코드를 점검했다. 2016년 9월 명세의 Dell Class V 1주는 WIKI 종가를 확보하지 못해 계산에서 제외했다. 2017년 3월 명세에서 편입·제외를 반영한 목록은 2017년 9월 명세의 505종목과 일치한다.
- 기준일별 편입·제외는 `data/market/spy-index-changes.json`에 기록했다. Coach와 IQVIA는 동일 주식의 종목코드 변경 전후를 연결했으며 종목코드 변경을 가로지른 결과에 회사 공시를 표시한다. Delphi처럼 주식 배분을 수반한 분할은 `data/market/spy-complex-actions.json`에 기록하고 해당 기간 계산에서 제외했다.

```sh
python3 scripts/market/rank_wiki_portfolio.py WIKI_PRICES.zip data/market/spy-holdings-2017-09.json \
  --first 2017-10-02 --last 2017-10-31 \
  --changes data/market/spy-index-changes.json --renames data/market/spy-ticker-changes.json \
  --actions data/market/spy-complex-actions.json --out data/market/months/spy-equity-rankings.json
```

### 2019년 이후 자료의 확보 조건

- [SEC Form N-PORT 데이터셋](https://www.sec.gov/data-research/sec-markets-data/form-n-port-data-sets)에서 지수 추종 펀드의 기준일별 보유 목록을 확인할 수 있다. 펀드의 실제 보유 목록을 사용할 경우 해당 펀드와 기준일을 화면에 표시하고, 공식 지수 구성 대신 사용하면 근사 모집단으로 기록한다.
- 일별 분할 조정 종가의 재배포 조건과 종목코드 변경 및 상장폐지 처리 범위를 확인한 뒤 지수 또는 펀드 보유 목록을 가격에 연결한다.
- 2025년 1월 모집단을 위한 직전 시점 자료로 [SPY 2024-12-31 보유 명세](https://www.sec.gov/Archives/edgar/data/884394/000175272425043826/NPORT_J905_96606633_1224.htm)와 [QQQ 2024-12-31 보유 명세](https://www.sec.gov/Archives/edgar/data/1067839/000175272425039757/edgar.htm)를 확인했다. 두 펀드에 겹치는 주식은 종목과 주식 종류를 대조해 한 번만 계산한다. 보유 기준일과 공시일은 별개이며, 이 명세의 보유 종목은 공식 지수의 월 첫 거래일 구성종목을 근사한다.
- [Tiingo 일별 가격 문서](https://www.tiingo.com/documentation/end-of-day)에서 기업행동 처리 필드를 확인할 수 있다. 공개 사이트에서 가격과 파생 결과를 제공하기 전에 활용 범위를 [서비스 약관](https://www.tiingo.com/tos/)과 공급 계약에서 확인해야 한다. 조정 종가에 배당이 반영되는 자료는 배당 제외 기준과 구분한다.

`scripts/market/extract_nport_universe.py`는 로컬에 저장한 N-PORT 원본 XML에서 보유 기준일과 보통주 분류를 확인하고 CUSIP·ISIN으로 중복을 줄인다. `--as-of YYYY-MM-DD`, 펀드별 `--report XML파일 SEC원문URL`, `--out 출력경로`를 지정한다. 공시에 빠진 티커는 따로 매핑해야 한다. 추출 결과는 가격 검증 전에 사용하는 근사 모집단이다.

가격을 확보한 뒤 `python3 scripts/market/join_nport_prices.py universe.json prices.csv --first 2025-01-02 --last 2025-01-31 --out joined.csv`로 결합한다. 가격 CSV에는 `security_id`(CUSIP 또는 ISIN), `symbol`, `first_date`, `last_date`, `first_adjusted_close`, `last_adjusted_close`, `source_url`, `exclusion_reason`을 넣는다. 보유 명세에 있는 종목마다 가격 또는 근거가 있는 제외 사유를 넣어야 하며, 모든 펀드 원문 링크가 순위 결과에 남는다.

## 게시 기준

시점별 모집단과 가격의 출처가 함께 확인된 행만 `scripts/market/calculate_returns.py` 입력으로 사용한다. 현재 월별 스냅샷에 제공하는 환율·금리·유가와 종목 수익률은 별도 데이터다.

월·시장마다 구성종목 전부를 CSV에 한 행씩 기록한다. `membership_source_url`과 `universe_count`로 모집단의 원문과 총종목 수를 기록한다. 거래정지 등으로 계산할 수 없는 경우 가격 대신 `exclusion_reason`과 근거인 `source_url`을 기록한다. 수익률 계산에 포함할 종목은 `exclusion_reason`을 비워 둔다. 스크립트는 종목 수가 맞고 계산 가능한 종목이 10개 이상인 월·시장만 등록한다. 같은 월의 다른 시장과 과거 월의 순위는 유지한다.

연초 구성종목과 연간 첫·마지막 거래일의 가격으로 검증한 CSV는 `python3 scripts/market/calculate_returns.py --annual input.csv`로 등록한다. 연간 결과는 최고·최저 수익률과 +900% 이상인 종목을 기록한다. 월별 순위를 합산해 연간 순위를 계산하면 기준일마다 모집단이 달라질 수 있다.

시장 지수의 재사용 조건도 지표별로 확인한다. FRED의 [S&P 500](https://fred.stlouisfed.org/series/SP500)과 [NASDAQ Composite](https://fred.stlouisfed.org/series/NASDAQCOM) 일별 자료에는 재배포 조건이 있다. 미국 연간 지수 화면은 [Nasdaq 2016년 연간 평가](https://indexes.nasdaqomx.com/docs/NDX100_AnnualEvaluation.pdf)에 공개된 2007~2016년 S&P 500·Nasdaq-100, [S&P DJI 연말 보고서](https://www.spglobal.com/spdji/jp/documents/commentary/market-attributes-sp500-202601.pdf)와 [Nasdaq 지수 팩트시트](https://indexes.nasdaq.com/docs/FS_COMP.pdf)에 공개된 2017~2025년 S&P 500·Nasdaq Composite 가격 수익률을 사용한다.

### 국내 종가 일괄 조회 실측

[FinanceData marcap 연도별 Parquet](https://github.com/FinanceData/marcap/tree/master/data)에서 2024년 파일 하나를 내려받아 두 거래일의 KOSPI·KOSDAQ 원종가 5,482행을 추출했다. 12월 2일은 2,737행, 12월 30일은 2,745행이며 KOSDAQ GLOBAL을 포함한다. 삼성전자 53,600원과 53,200원은 네이버 일별 조회와 각각 일치했다. 같은 파일에서 SK하이닉스(158,800원 → 173,900원), 현대차(216,000원 → 212,000원), 에코프로비엠(137,500원 → 109,900원), 알테오젠(302,000원 → 309,500원)도 조회했다.

`scripts/market/extract_marcap_closes.py`는 DuckDB로 필요한 두 날짜만 읽는다. 원종가와 상장주식수를 로컬 검증 CSV에 기록한다. 기간 수익률을 발행하려면 기준일 당시 지수 구성종목, 기업행동에 대한 수정 가격, 출처의 공개 이용 범위를 추가로 확인해야 한다. 상장주식수 변화는 기업행동 검토에 활용할 수 있다.

삼성자산운용의 [KODEX 200](https://www.samsungfund.com/api/v1/kodex/product-pdf/2ETF01.do?gijunYMD=2024.12.02)과 [KODEX 코스닥150](https://www.samsungfund.com/api/v1/kodex/product-pdf/2ETF54.do?gijunYMD=2024.12.02)의 보유종목 응답은 요청일인 2024-12-02를 반환했다. 원화예금을 제외한 200개와 153개 종목 모두 가격 파일에 양쪽 종가가 있었다. 두 ETF의 보유종목 개수는 그날 지수 구성종목 수(201개와 150개)와 차이가 있어 구성종목 후보와 가격 연결을 검증하는 데 사용한다. 기간 중 상장주식수가 달라진 후보는 각각 7개와 15개였다. 기업행동 유형과 가격 조정 여부는 공시와 대조해야 한다.

[2024-12-31 증권사 시장 리포트](https://stock.pstatic.net/stock-research/market/31/20241231_market_79323000.pdf)의 직전 거래일 지표에서도 SK하이닉스, 현대차, 알테오젠의 12월 30일 종가가 일치했다.

### 2024년 말과 2026년 미국 지수 종가 보완

- 2024년 11월 미국 지수의 첫 거래일은 [Beacon Trust의 11월 1일 마감 표](https://www.beacontrust.com/insights/recurring-publications/2024/november/beacon-weekly-investment-insights-11424), 마지막 거래일은 [Raymond James의 11월 29일 마감 표](https://www.raymondjames.com/-/media/rj/advisor-sites/sites/f/a/faganfinancialgroup/files/2024-commentaries/equity-markets-carried-in-november-by-post-election-rally.pdf)에서 확인했다.

- 2024년 12월 국내와 미국의 첫 관측은 [12월 3일 키움 데일리](https://bbn.kiwoom.com/research/SPdfFileView?attaFile=1733178179248.pdf&makeDt=2024.12.03&rMenuGb=SD)의 전일 마감 수치를 사용했다. 국내 마지막 거래일은 12월 30일로 [한국은행 발표](https://www.bok.or.kr/portal/bbs/P0002018/view.do?menuNo=200366&nttId=10088999), 미국은 12월 31일로 [이듬해 1월 2일 키움 데일리](https://bbn.kiwoom.com/rfSD6455)에서 확인했다.
- 2026년 1~8월 미국 지수는 키움 데일리, Roan Capital Partners의 시황, Portfolio Terminal의 날짜별 마감 정보에서 확인했다. 16개 거래일의 두 지수 값을 FRED 관측과 로컬에서 대조했다. 6월 2일 키움 데일리 표의 Nasdaq 값은 6월 1일 종합지수와 일치하지 않아 [해당 거래일 마감](https://portfolio-terminal.com/markets/stock-market-close/june-1-2026)을 사용했다.

2024년 12월 ETF 보유 목록 353종목을 20거래일의 일별 시세로 대조했다. 하루의 종가에서 등락금액을 빼 얻은 기준가격이 직전 종가와 달랐던 종목은 7개, 상장주식수 변화가 있었던 종목은 22개였다. 두 조건을 통과한 324종목에 대해 로컬에서 시범 순위를 산출했다. `scripts/market/rank_kodex_price_research.py`는 날짜가 일치하는 공식 운용사 보유 명세와 금액 기준이 연결되는 가격만 사용한다. ETF 모집단은 당시 지수 목록과 다르며, 시세 자료의 공개 재이용 범위가 확인되지 않아 시범 순위는 공개 데이터에서 제외했다. [KRX 시장정보 이용정책](https://data.krx.co.kr/inc/datasale/Market%20Data%20Usage%20Polices_ko.pdf)
