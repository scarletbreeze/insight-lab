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

### 2008년 및 2014~2018년 WIKI/PRICES

- [2008년 9월 말 QQQ 명세](https://www.sec.gov/Archives/edgar/data/1067839/000110465909005352/a08-28674_2n30b2.htm)의 주식 100개 평가액 합계는 $18,091,801,491이다. 2008년 HANS(Hansen Natural)와 MNST(Monster Worldwide)는 가격 파일에서 각각 MNST와 MWW로 기록된다. 당시 명칭, 코드 변경 근거, 기준일 주당 평가액을 대조했다. 4분기 각 월의 100개 중 84개 종목에서 수익률을 계산했다.
- [2014년 9월 말 QQQ 명세](https://www.sec.gov/Archives/edgar/data/1067839/000110465915002429/a14-24967_1n30b2.htm)의 주식 103개 평가액 합계는 $42,033,212,910이다. 이후 편입·제외·코드 변경을 적용한 2015년 9월 말 109개 코드는 다음 공시와 일치했다. 2015년 연초 107개 중 기간 전체를 계산한 93개를 연간 순위에 사용했다.
- 2008년 10~12월과 2014년 10월~2018년 2월의 44개월 및 2015~2017년 연간 순위를 수록했다. 2018년 3월~2019년 12월의 22개월은 운영자가 직접 내려받은 Stooq `d_us_txt.zip`(2026-11-27자)으로 `rank_archive_portfolio.py --dividend-adjusted`를 실행해 추가했다(아래 "Stooq 아카이브" 참조). 모집단은 QQQ의 [2015년 9월 말](https://www.sec.gov/Archives/edgar/data/1067839/000119312516441831/d106822d485bpos.htm), [2016년 9월 말](https://www.sec.gov/Archives/edgar/data/1067839/000119312516806695/d272217dn30b2.htm), [2017년 9월 말](https://www.sec.gov/Archives/edgar/data/1067839/000119312518001208/d432220dn30b2.htm) 보유 명세를 기준으로 한다. 중간 시점은 `data/market/qqq-index-changes.json`의 기준일별 변경을 반영한다. 2015년 9월 명세에서 출발해 변경을 반영한 2016년 9월의 105종목은 해당 시점 QQQ 보유 명세와 일치한다. 2016년 12월에는 [Nasdaq 연간 평가](https://indexes.nasdaqomx.com/docs/NDX100_AnnualEvaluation.pdf)에 기록된 LiLAC 두 종류를 포함한다. 결과에는 사용한 보유 명세와 근사 모집단이라는 기준을 표시한다.
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

### Stooq 아카이브 (2018년 3월~2019년 12월, QQQ)

- Stooq의 미국 일별 아카이브는 분할과 **배당 재투자를 함께 반영한 조정 종가**다. 스크립트의 분할 검증(AAPL 2020-08-28 분할 전 종가 124.81)에서 120.86이 나와 배당 제외 기준으로는 거절되므로, 운영자가 2026년 11월 28일 **총수익 기준으로 라벨을 붙여 수록**하기로 결정했다. `--dividend-adjusted`는 무배당 종목(TSLA)의 분할 검증은 그대로 요구하고 배당 종목은 분할 기준값 아래 15% 안에 있을 때만 통과시키며, `--disclosure`를 반드시 받아 월 화면에 기준 차이와 결정일을 표시한다(`priceBasis: total-return`).
- 아카이브는 **현재 상장 종목만** 담고 있어 이후 인수·합병·상장폐지된 종목(ALXN·ATVI·CA·CELG·CERN·CTXS·DISH·EA·ESRX·HOLX·MXIM·MYL·SHPG·WBA·XLNX, 2019년 3월 전 FOX·FOXA, QVCA)은 '가격 아카이브의 거래일 범위 미충족'으로 제외된다. 월별 계산 종목은 2018년 3월 85/104에서 2019년 12월 94/103이며, 제외 수와 생존 종목 편향 가능성을 월 화면의 공개 문구에 적었다.
- 동일 주식의 종목코드 변경은 보유 명세의 `archiveSymbol`(PCLN→BKNG, FB→META, CTRP→TCOM, SYMC→NLOK→GEN)과 편입 기록의 객체형 `add`(WLTW→WTW, NLOK→GEN)로 현재 코드의 시계열에 연결했다. 출처는 각 회사 IR 공지 또는 SEC 8-K다. 2019년 3월 Fox의 분사·합병은 복합 기업행동으로 제외한다.
- 같은 방법으로 2018년 2월을 계산해 WIKI 가격 수익률과 대조한 결과는 `docs/v1-implementation-check.md`의 2026년 11월 28일 절에 있다. 2020년 이후는 QQQ 편입·제외 기록(2019-12-23까지)과 N-PORT 보유 명세가 없어 수록하지 않는다.

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

2024년 국내·미국 지수는 각 시장의 거래일을 별도로 구해 12개월 모두 첫날·마지막 날 종가를 수록했다. 국내 1~10월은 네이버 일별 지수 값과 키움증권 보고서, SPARX 월말 공시 또는 KIND 투자설명서의 두 지수 값을 대조했다. 미국 1~9월은 S&P 500·Nasdaq Composite의 FRED 관측일·관측값을 증권사 보고서나 해당 거래일 AP 마감 기록과 대조했다. 3월 미국의 마지막 거래일은 28일, 한국은 29일이다. 각 시장·각 날짜의 원문 주소는 월간 지수 JSON에 있다.

### 2016년 12월~2023년 미국 지수 월간 종가 보완 (2026년 11월 26일)

- 미국 두 지수의 월초·월말 종가 수록 범위를 57개월에서 119개월로 늘려 2016년 12월부터 2026년 10월까지 모든 달을 채웠다. 2021~2023년의 미수록 24개월은 당시 보도 48건을 출처로 한다. AP 「How major US stock indexes fared」 표와 AP 마감 기사의 공개 전재본(cheddar.com, KTVZ, KVIA, KESQ, KUTV, WJLA, AJC, PBS NewsHour, American Press, Yahoo 뉴스 등), Newser의 통신 기반 기사, Zacks 시황(2023년 9월 1일)을 사용했다. 각 페이지를 다시 내려받아 두 지수 값이 본문에 있는지 확인한 뒤 등록했다.
- 보도값 96개를 FRED [SP500](https://fred.stlouisfed.org/series/SP500)·[NASDAQCOM](https://fred.stlouisfed.org/series/NASDAQCOM) 관측과 대조한 결과 95개가 일치했다. 2021년 2월 26일 Nasdaq Composite는 AP 보도값 13,192.34로, FRED 관측값보다 0.01포인트 낮다. 해당 월에는 2020년 9·10월과 같은 방식의 안내와 두 출처가 있다. 경계 거래일은 모두 FRED의 월 첫·마지막 관측일과 같았다.
- 2016년 12월, 2017~2019년 36개월, 2022년 5월의 38개월은 당시 보도를 확보하지 못해 FRED 관측값을 출처로 수록했다. 두 계열은 FRED에서 `copyrighted: pre-approval required`로 표시되며 S&P DJI 고지에는 사전 서면 허락 없는 재생산 금지가 적용된다. 2026년 11월 26일 FRED를 주 출처로 쓰는 방안을 검토해 운영자가 발표용으로 포함하기로 결정했고, 방법론 화면과 해당 월 화면에 이 사실을 표시한다. 이 달들은 `firstSource`·`lastSource`의 호스트가 `fred.stlouisfed.org`라는 점으로 구분할 수 있어 이후 보도 출처로 교체하거나 제외할 수 있다. 2022년 5월 2일은 CBS·Kiplinger 기사에 반올림 값만 있어 보도 출처로 채우지 못했다.
- FRED 출처 월의 독립 대조: 2016~2019년 연말 종가로 계산한 달력 연도 가격 수익률(S&P 500 19.42%·-6.24%·28.88%, Nasdaq Composite 28.24%·-3.88%·35.23%)은 `data/market/us-annual-benchmarks.json`에 수록한 S&P DJI 연말 보고서와 Nasdaq 팩트시트의 2017~2019년 값과 소수 둘째 자리까지 일치한다. 2018년 12월 31일 종가(2,506.85·6,635.28)는 [AP 연말 마감 기사](https://www.pbs.org/newshour/economy/stock-market-suffers-worst-year-since-2008-financial-crisis)와도 일치한다.
- FRED SP500은 최근 10년만 제공하므로(현재 2016년 11월 28일 이후) 2016년 11월 이전은 S&P 500의 보도·공식 출처가 필요하다. 같은 이유로 FRED를 출처로 한 2016년 12월~2017년의 S&P 500 값은 시간이 지나면 FRED 화면에서 사라지므로, 그때는 보관한 CSV 사본으로만 재확인할 수 있거나 보도 출처로 교체해야 한다. NASDAQCOM만 있는 달은 두 지수 쌍 계약을 지키기 위해 수록하지 않는다. 2009년~2016년 11월의 95개월과 1990~2007년은 미수록 상태로 남아 있다.

```sh
python3 scripts/market/verify_us_index_closes.py --through 2026-11-25            # 보도 출처 값과 FRED 관측 대조, 미수록 월 목록
python3 scripts/market/collect_us_index_closes.py --through 2026-10-31           # 미수록 월만 FRED 출처로 추가 (기존 월은 유지)
```

`collect_us_index_closes.py`는 보도 출처가 있는 달을 덮어쓰지 않으며, `--overwrite fred`는 FRED 출처 월만, `--overwrite all`은 모든 달을 다시 쓴다. `--csv`로 미리 내려받은 FRED CSV를 사용할 수 있다.

2024년 1~10월과 12월에 각 월 첫 거래일의 삼성자산운용의 두 ETF 보유 명세(KODEX 200·코스닥150)를 월별 시세와 대조했다. 11월 1일 명세 요청은 HTTP 429를 반환했다. 날짜를 다른 달 명세로 대체하지 않았다. 공개 데이터는 검증 범위와 사유별 건수이며 종목별 Top 10은 로컬 계산 결과에 있다. 금융위원회 주식시세 API도 제3자 권리와 재배포 제한을 명시한다. [공공데이터포털 이용 조건](https://www.data.go.kr/data/15094808/openapi.do)

2024년 11월 1일의 두 운용사 엑셀 명세도 HTTP 429를 반환했다. 이와 별도로 2024년 12개월을 월초 KOSPI·KOSDAQ 시세 파일에 등장하는 전체 종목코드 기준으로 추적했다. 11월은 2,724개 중 2,560개가 통과했다. 추가 확인 대상은 일별 관측·가격 6개, 전일 종가와 기준가격 차이 21개, 상장주식수 변화 137개다. 하나의 종목에 여러 사유가 있으면 이 순서로 한 번만 집계한다. DuckDB가 설치된 환경에서 저장소 루트의 `python3 scripts/market/summarize_price_coverage.py /path/to/marcap-2024.parquet 2024`로 공개 JSON을 재현할 수 있다.

2024년 연간 검증에는 1월 2일의 두 ETF 보유 주식과 12월 30일까지의 일별 가격을 사용했다. 월별 검증과 같은 명령에 `--annual`을 추가하고 `--out .local-research/kr-equity-annual-2024.json`을 지정하면 통과 종목의 Winner·Loser·Tenbagger를 로컬에서 확인할 수 있다. KRX의 [이용자별 데이터 수신 및 계약 안내](https://openapi.krx.co.kr/contents/OPP/DATA/OPPDATA003.jsp)는 단순 참고 외 용도와 시세 재배포의 계약 경로를 설명한다. 과거 종가로 계산한 종목명·순위·수익률만 비영리 정적 사이트에 정기 게시하는 경우에 적용되는 조건은 개별 확인이 필요하다. 문의 시에는 원시 종가 제공 여부, 월간 Top 10과 연간 최고·최저 표시, 과거 자료의 공개 보관 기간, 표시할 출처, 계약·이용료 적용 여부를 함께 명시한다.

## 2024년 11월 명세와 거래량 재검증

11월 1일 KODEX 조회가 재차 HTTP 429를 반환했다. 같은 기준일의 미래에셋 공식 자료실에서 TIGER 200과 TIGER 코스닥150을 조회했다. 페이지의 펀드코드·선택일, 전체 행 수(202·155), 별도 엑셀 내려받기의 코드·이름을 비교했다. 각 펀드의 원화예금을 제외한 주식은 201개와 154개였다. 공개 수치는 두 펀드의 합집합을 기준으로 한다. KODEX를 사용한 다른 달과 운용사가 다르며, 펀드 보유 종목은 지수의 근사 모집단이다.

11월 기존 검사로는 328개가 통과했으나 5개는 첫날 또는 마지막 날의 거래량이 0이었다. 첫날과 마지막 날에 모두 거래량이 있는 조건으로 12개월과 연간 집계를 재생성했다. 11월 355개 중 323개가 통과했고, 5개는 거래량, 27개는 상장주식수 변경으로 제외했다. 로컬 연구용 순위에는 이 기준을 적용했다. ETF 명세와 통과·제외 건수는 공개하고 종목별 순위는 로컬 파일에 보관한다.

`collect_tiger_holdings.py`에 펀드코드, 기준일, 로컬 출력 경로를 넣고 두 펀드의 파일을 생성한다. `rank_kodex_price_research.py`에 두 파일을 200·코스닥150 순서로 넣고 `--provider tiger`를 지정해 검증한다.

### 2024년 12월 교차 검증

월초 KODEX 두 상품의 보유 주식 353개 중 거래일·가격·주식수 조건을 통과한 321개에 대해 네이버 일봉의 12월 2일과 30일 종가로 순위를 재계산했다. 상위 10개 순서가 전부 일치했고 두 출처에서 계산한 수익률의 최대 차이는 0.005%p 미만이었다. 제외 종목을 포함한 지수 전체 순위와 가격 파생 결과의 공개 이용 조건은 확인 중이다. [시세 파일](https://github.com/FinanceData/marcap/tree/master/data) · [금융위원회 주식시세정보](https://www.data.go.kr/data/15094808/openapi.do)

동일한 교차 검증을 2024년 1–12월에 적용했다. 통과한 3,846개 종목·월의 두 경계 가격이 두 자료에서 확인됐고, 매월 10개씩 120개 순위가 일치했다. 종목·월은 매달 반복해서 들어오는 종목을 포함한다.

## 제외 종목의 기업행동 확인 (2024년 11월·2024년 연간)

검사에서 제외된 종목의 사유가 공개 공시로 설명되는지 확인했다. 로컬 시세 파일에서 상장주식수가 바뀐 날짜와 변동 주식수를 뽑고, KRX KIND의 [주식발행내역](https://kind.krx.co.kr/corpgeneral/stockissuelist.do?method=loadInitPage)(추가상장·변경상장 2024-01-02~2024-12-30, 3,087행)에서 같은 회사·같은 날짜(±3일, 달력 기준) 행의 합 또는 최대 3행의 조합이 변동 주식수와 일치하면 KIND가 적은 사유를 그대로 옮겼다. KIND 법인명이 시세 파일의 종목명과 다른 경우(현대자동차·케이티앤지·리가켐바이오 등 11개)는 DART 회사검색에서 종목코드로 법인명을 확인해 `data/market/kr-company-aliases.json`에 기록한 이름만 허용하고, 화면에는 KIND 법인명을 함께 표시한다. 거래량 0 종목은 DART에 게시된 거래소의 매매거래정지 공시로, 기준가격 차이는 차이가 난 날로부터 80일 안에 상장된 권리락 발생 행동(무상증자·주식분할·주식배당·회사분할·구주주배정 유상증자)으로만 설명한 것으로 본다. 상장주식수 변동이 KIND와 일치해도 기준가격 차이나 관측 누락의 원인은 설명되지 않으므로 `자료 확인 중`으로 둔다. 결과는 `data/market/kr-exclusion-actions.json`에 사유별 분모·확인 건수와 종목별 사실(종목명·코드·검사 결과·KIND 사유·상장일·변동 주식수·DART URL)만 기록하고 가격과 거래량 값은 넣지 않는다. 제외 사유와 거래량 0·기준가격 차이 날짜는 KRX 일별 시세 사본의 로컬 검증 결과이며 날짜만 공개한다.

- 2024년 11월(TIGER 두 펀드 355종목 중 제외 32개): 32개 모두 사유를 확인했다. 상장주식수 변경 27개는 전부 KIND 발행내역과 일치하며 기준가격 조정이 없는 변동이다. 주식매수선택권 행사 16개, 주식소각 5개(기아·NAVER·신한지주·한미반도체·현대백화점), 전환사채 전환 3개(HMM 1억 3,200만 주 등), 유상증자(제3자배정) 1개(금양), 합병 신주 1개(SK이노베이션 5,529만 주), 신주인수권 행사 1개(HLB생명과학). 거래량 0인 5개는 매매거래정지 공시로 확인했다: GS리테일(회사분할), 현대사료·국일제지(상장적격성 실질심사), 엔케이맥스(회생절차 개시), 셀리버리(6월 3일 상장폐지 정리매매 개시로 정지 해제, 6월 4일 투자자 보호를 위한 재정지). 종목별 DART URL은 데이터 파일과 월 화면에 있다.
- 2024년 연간(KODEX 두 펀드 350종목 중 제외 134개): 123개의 사유를 확인했다. 상장주식수 변경 105개 중 105개가 확인됐으며 KIND 일치·기준가 조정 없음 100개, KIND 일치·권리락 조정 필요 4개, KIND 행은 없으나 DART 주식소각결정으로 확인 1개(HD현대인프라코어)다. 거래량 0 3개는 모두 거래정지 공시로 확인했다(엔케이맥스·카나리아바이오(현대사료)·셀리버리, 셀리버리는 2023년 3월 23일 정지 공시가 1월 2일을 설명한다). 기준가격 차이 23개 중 15개는 권리락 발생 행동의 KIND 상장일로 확인했고, 6개는 주식수 변동은 일치하지만 기준가격 차이의 원인이 미확인(셀트리온·셀트리온제약·종근당의 12월 27일, 현대바이오·다원시스·이오플로우), 2개는 주식수 변동 없이 12월 27일 기준가격이 달랐다(영풍·에프에스티). 관측 누락 3개(쌍용C&E·제이시스메디칼·커넥트웨이브)는 자료 확인 중이다. 기업행동 종류별 종목 수는 주식소각 47, 주식매수선택권 행사 44, 전환사채 전환 25, 유상증자 17, 무상증자 8, 우선주 전환 8, 신주인수권 행사 7, 합병 신주 5, 회사분할 3, 주식분할 2, 주식배당 2, 주식교환 2다(한 종목이 여러 종류에 해당하면 각각 센다).
- 가격 비교 가능성: 주식소각·주식매수선택권 행사·전환사채 전환·우선주 전환·제3자배정 유상증자·합병 신주는 기준가격을 바꾸지 않아 첫날·마지막 날 종가를 그대로 비교할 수 있다. 상장주식수 변경 사유로 제외된 종목 중 11월 27개 중 27개, 연간 105개 중 100개가 여기에 해당하며, 이들 종목에서는 전일 종가와 기준가격의 차이가 관측되지 않았다. 권리락이 생기는 행동은 권리락일이 상장일보다 앞선다(LG디스플레이 1월 25일 기준가격 차이, 3월 26일 신주 상장). 유한양행·한미약품의 1월 19일 무상증자 상장처럼 권리락이 기간 시작 전에 지난 경우는 기준가격 차이가 관측되지 않아 상장주식수 변경으로만 제외되며, 이들을 포함한 연간 4개 종목은 KIND 발행내역의 비율로 첫 종가를 조정한 뒤에만 비교할 수 있다. 조정 수익률은 아직 산출하지 않았다.

`scripts/market/classify_exclusions.py`는 시세 Parquet, 두 ETF 보유 명세, `--first/--last`, 로컬에 저장한 KIND 주식발행내역 페이지 디렉터리(`--kind-pages`), 법인명 별칭(`--aliases`)과 DART 문서 목록(`--documents`)을 받아 종목별 연구 파일(`--out`)을 만들고 `--publish`로 공개 데이터 파일의 해당 기간을 갱신한다. 다음 단계는 기준가격이 바뀌지 않은 변동을 제외 사유에서 분리해 통과 종목에 포함할지 결정하고, 권리락 종목은 발행내역의 비율로 조정한 뒤 네이버 일봉과 교차 검증하는 것이다.

### 2008년 미국 지수 월간 종가 보완 (2026년 11월 27일)

2008년 12개월 중 1·4·5·6·7·8월의 월초·월말 종가를 호놀룰루 스타불러틴 아카이브에 실린 AP 마감 보도(다음 날 아침 게재, 본문은 전일 장을 설명)에서 확보했다. 여섯 달의 Nasdaq Composite 값 12개는 FRED NASDAQCOM 관측과 모두 일치하며, S&P 500은 FRED에 2008년 자료가 없어 해당 보도 한 건이 유일한 출처다. 2월 29일(CBS/AP), 10월 31일(NBC/AP, MarketWatch와 0.01 차이), 12월 31일(CBS/AP)은 값을 찾았지만 같은 달의 다른 경계일 보도를 찾지 못해 수록하지 않았고, 9월 30일 NBC/AP 보도의 Nasdaq 값은 FRED와 달라(잠정치) 사용하지 않았다. 2·3·9·10·11·12월은 미수록이다. 시도한 출처와 실패 사유는 세션 조사 기록에 남겼다.

### 한국 월간 Top 10·연간 Winner·Loser 전 기간 산출 (2026년 11월 27일)

운영자가 2026년 11월 27일 "수익률 그해 그 달에 어떤 종목이 Top 10이었는지 할 수 있는 만큼만 찾아서 대략적으로라도 적어라"고 결정해, 로컬에만 두었던 2024년 12개월의 ETF 보유 명세 기준 순위와 연간 결과를 `data/market/months/kr-equity-rankings.json`·`data/market/kr-annual-equity-rankings.json`에 그대로 공개하고, 나머지 기간은 근사 모집단으로 확장했다. 미국 순위 파일(`equity-rankings.json`)은 수정하지 않았다.

- 출처: [FinanceData marcap](https://github.com/FinanceData/marcap/tree/master/data) 연도별 Parquet 32개(1995~2026, 약 542MB). 저장소 설명은 "market cap datasets (1995~2026 daily, 10 million+ rows)"이며 README는 KRX 정보데이터시스템 전종목시세를 정리해 연도별로 묶은 자료라고 설명한다. 저장소에 LICENSE 파일이 없고 GitHub API의 license 항목도 비어 있으며 README에 재사용 조건이 적혀 있지 않다(README 끝의 표기는 "2018-2026 [FinanceData.KR]"). README는 CSV.gz를 언급하지만 현재 data 디렉터리에는 Parquet만 있다. KRX 시세의 재배포 조건은 위의 [KRX 시장정보 이용정책]과 [이용자별 데이터 수신 및 계약 안내]에 따라 별도 확인 대상이며, 운영자는 FRED 월과 같은 방식으로 발표용 포함을 결정했다. 방법론 화면과 각 월·연도 카드에 출처와 결정일을 표시하고, 데이터에는 `decisionDate: 2026-11-27`을 넣어 이후 제외·교체할 수 있게 했다.
- 파일 특성: 1995~2000년 파일은 종목코드의 앞자리 0이 빠져 있어(`5930`) 여섯 자리로 채웠고 같은 날 중복 코드는 없었다. `Changes`(전일대비)는 부호가 있으며 전 기간에서 `종가 − 전일대비 = 전일 종가`가 99.5% 이상 성립해 기준가격 차이 검사를 1995년부터 적용할 수 있다. 시장은 KOSPI·KOSDAQ·KOSDAQ GLOBAL만 사용하고 KONEX(2013~)는 제외했다. 월의 첫·마지막 거래일은 `korea-index-closes.json`의 검증된 달력과 비교했고 1995년 5월~2026년 10월 378개월 모두 시세 파일의 첫·마지막 날짜와 일치했다(1990년대 토요일 장 포함).
- 모집단 규칙(`universeRule`): 각 달 첫 거래일의 종가×상장주식수로 계산한 시가총액 상위 KOSPI 200개와 KOSDAQ 150개 보통주. 우선주·신주인수권 등 종목코드 끝자리가 0이 아닌 종목, 이름에 '스팩'이 있는 종목, 이름이 '리츠'로 끝나는 종목은 제외한다. ETF·ETN은 이 파일에 없다. 코스닥 시세가 시작되기 전인 1995년 5월~1996년 6월 14개월은 KOSPI 200개만으로 모집단이 200개다. 연간 결과는 해당 연도 첫 거래일의 같은 모집단을 12월 마지막 거래일까지 추적한다. 월초 모집단에는 이후 상장폐지 종목이 포함되지만, 기간 중 거래가 끊긴 종목은 관측·거래량 규칙으로 제외되어 하락 종목이 과소 반영될 수 있다(1998년 연간은 350개 중 237개 제외). 1996~1998년 코스닥은 경계일 거래량 0으로 150개 중 대부분이 빠진다(1997-10-01 94개, 1998-01-03 97개). 시장별 계산 종목 수를 `eligibleByMarket`으로 기록해 화면에 표시한다. 지수 공식 구성종목과는 다른 근사 모집단이므로 `membership: approximate`로 표시한다.
- 제외 규칙(`priceMethod`): 월(연)의 모든 거래일에 관측이 있고 종가·상장주식수가 유효해야 하며, 첫날·마지막 날 거래량이 0이면 제외, 어느 날이든 전일 종가와 기준가격이 다르면 제외, 상장주식수가 한 번이라도 바뀌면 제외한다. 사유는 이 순서로 하나만 기록한다. 수익률은 첫·마지막 거래일 원종가 비교(수정주가 미반영, 배당 제외)로, 분할 조정 종가가 없으므로 상장주식수 변경 종목 제외가 그 대체 수단이다. 계산 가능 종목이 10개 미만이면 그 달은 수록하지 않는다(해당하는 달은 없었다).
- 결과: 월간 378개월(1995년 8개월, 1996~2025년 각 12개월, 2026년 10개월), 월별 계산 종목 수 141~337개(최소 1996년 3월). 연간 1996~2025년 30개 연도(2024년은 ETF 모집단 로컬 검증 결과를 그대로 사용). 2024년 12개월은 로컬 검증 파일과 동일하며 `kr-equity-coverage.json`의 종목 수·사유별 건수와 일치한다. 같은 2024년을 시가총액 모집단으로 다시 계산하면 겹치는 종목의 수익률은 모두 같았고 상위 10개 중 평균 7개가 겹쳤다(모집단 차이로 달라지는 범위를 보여 준다). 미수록: 1995년 1~4월(시세 없음), 2026년 11~12월(달력 없음). Tenbagger는 2023년 포스코 ICT(6,100원→74,200원, +1,116%) 하나다.
- 교차 검증(네이버 금융 일별 시세 API, 2026-11-27 조회): 네이버는 분할·증자를 반영한 수정주가를 돌려주므로 1990년대~2010년대는 수익률로 비교했고, 2008년 이후 조정이 없는 종목은 원종가가 그대로 일치했다. 월간 수익률 비교(공개값 / 네이버): 삼성전자 1996년 1월 −1.056 / −1.055, 삼성전자 1997년 10월 −32.622 / −32.594, 롯데제과 1996년 7월 53.977 / 53.993, 한국카본 1996년 8월 27.273 / 27.266, 효성티앤씨 1998년 1월 210.145 / 210.205, 삼성전자 1998년 1월 119.753 / 119.864, 종근당 1998년 1월 154.887 / 154.901, 삼성전기 1998년 1월 116.964 / 116.988, 핸디소프트 1999년 12월 746.364 / 746.468, SK하이닉스 2000년 2월 −26.939 / −26.939, 동특 2001년 1월 620.833 / 620.829, 삼성SDI 2003년 10월 22.000 / 22.000, 현대차 2008년 10월 원종가 73,600→58,800 일치, HK저축은행 2008년 10월 4,780→6,700 일치, SK하이닉스 2013년 5월 29,450→32,200 일치, LG화학 2016년 11월 244,500→226,500 일치, 씨젠 2020년 3월 175.000 / 174.995, 셀트리온제약 2020년 3월 96.798 / 96.804, 포스코 ICT 2023년 연간 6,100→74,200 일치, 현대상선 2003년 연간 407.692 / 407.411, 삼성전자 2024년 6월·2025년 9월, SK하이닉스 2025년 11월, 안랩 2025년 9월 원종가 일치. 수익률 차이는 네이버 수정주가의 정수 반올림 범위(0.1%p 미만)였고 1995년 5월~12월 삼성전자(17.99 / 18.46)는 연중 조정 사유를 확인하지 못해 차이로 기록한다(1995년 연간은 수록 대상이 아니다). 네이버에는 1995년 삼성전자와 1999년 12월 다음·한글과컴퓨터의 일별 값이 없었다.
- 2026년 9월 14일 이후의 차이: 안랩·루닛·삼성전자·SK하이닉스의 2026년 9월 14일부터 11월 25일까지 일별 종가가 네이버와 다르고(거래량·시가는 일치, 네이버 고가·저가가 더 넓음) 그 이전은 모두 같았다. 이 날은 KRX 애프터마켓(16:00~20:00) 개장일이므로 포털의 일별 종가가 시간외 거래를 반영한 것으로 보이며, marcap은 정규장 종가를 담는다. 10월 16일 삼성전자 정규장 종가 215,500원은 외부 종목정보 페이지 표기와 일치했다. 2026년 9·10월 순위는 정규장 종가 기준이며 방법론 화면에 적었다. [애프터마켓 개장 보도](https://biz.sbs.co.kr/amp/article/20000334035)
- 코드와 검증: `scripts/market/rank_marcap_months.py`(DuckDB로 연도 파일을 읽고 순수 함수로 모집단·제외·순위를 계산, 약 16초), `tests/test_market_research.py`의 `MarcapRankingTest`, `tests/data.test.ts`의 한국 순위 검사. 재현 명령은 README에 있다. 화면은 `EquityRankings.astro`·`AnnualEquityHighlights.astro`가 미국 파일에 한국 항목이 없을 때 이 파일을 읽고, 근사 모집단·모집단 규칙·제외 건수·"수정주가 미반영 · 주식수 변동 종목 제외 · 출처 FinanceData marcap(KRX 종가 집계) · 운영자 2026-11-27 발표용 포함 결정"을 표시한다.

### 2018년 3월 이후 미국 종목 수익률 확장 준비 (2026년 11월 27일)

운영자는 2018년 3월~2026년 10월의 미국 월간 Top 10을 근사치로라도 수록하길 원했고, 출처와 결정일을 표시하는 조건으로 출처 이용 위험을 받아들였다. 이날 조사에서는 이용 조건을 확인한 분할 조정 일별 종가를 자동으로 확보하지 못해 **이 기간의 월간·연간 순위는 수록하지 않았다**(결정 C: 수집 가능한 모집단·변경 기록·스크립트·검증·화면만 준비하고, 조건을 확인한 아카이브가 들어오면 계산한다).

- Stooq(`https://stooq.com/q/d/l/?s=aapl.us&i=d`, `https://stooq.com/db/h/`, `static.stooq.com`)는 모든 경로가 자바스크립트 작업 증명 확인 페이지("This site requires JavaScript to verify your browser") 뒤에 있어 자동 접근으로는 자료와 이용 조건 페이지를 모두 받을 수 없었다. 확인 절차를 우회하지 않았다. 운영자가 브라우저에서 `stooq.com/db/h/`의 일별·미국·ASCII 묶음(`d_us_txt.zip`)을 직접 내려받으면 아래 스크립트가 그대로 읽는다.
- nasdaq.com 과거 시세 API(`api.nasdaq.com/api/quote/{symbol}/historical`)는 키 없이 응답하고 분할 조정·배당 미반영 종가를 준다(AAPL 2018-03-01 43.75 = 175.00/4, 2020-08-28 124.8075 = 499.23/4). 그러나 상장폐지 종목(CELG·ESRX)은 "Symbol not exists"를 반환하고, [Nasdaq Legal Information](https://www.nasdaq.com/legal)(Last Updated: May 11, 2026)은 "a personal, limited, revocable, non-exclusive, non-assignable, non-sublicensable and non-transferable license to use the Services solely for your personal, non-commercial use", "you agree not to sell, copy, distribute, or create derivative works based on the Services", "Not access or use the Service, or any process, whether automated or manual, to capture data or content from the Service"를 명시한다. Yahoo Finance와 같은 부류로 보아 사용하지 않기로 했다. 확인용 5회 조회 외에 수집하지 않았다.
- S&P DJI의 월간 「S&P 500 Market Attributes」 PDF(`https://www.spglobal.com/spdji/jp/documents/commentary/market-attributes-sp500-YYYYMM.pdf`)는 월간 상·하위 종목 표를 공표 자료로 옮길 후보였으나, `spglobal.com`은 `/spdji/jp/...`·`/spdji/en/...` 문서와 지수 소개 페이지 모두 HTTP 403을 반환해 이 환경에서 한 달도 읽지 못했다. 브라우저에서 내려받은 PDF가 있으면 pypdf(가상환경에 설치 가능)로 표를 확인한 뒤 별도 자료 유형(`S&P DJI 월간 보고서 공표 순위`)으로 기록할 수 있다.
- SEC EDGAR는 처음 30건을 자동 도구임을 밝히지 않은 User-Agent로 요청한 뒤 `www.sec.gov`와 `data.sec.gov` 모두 "Your Request Originates from an Undeclared Automated Tool"(403)을 돌려주었고, 선언형 User-Agent로 바꾼 뒤에도 세션이 끝날 때까지 풀리지 않았다. QQQ 보유 명세 원문은 받지 못했으며 `data/market/qqq-holdings-*.json`은 2017-09가 마지막이다. 차단 전에 받은 제출 목록으로 2018-09-30 N-30B-2 1건과 2019-09-30~2026-06-30 N-PORT 28건(분기 말, 2026-09-30분은 2026년 11월 말 공시 예정)을 확인했다. `python3 scripts/market/download_qqq_filings.py --out <폴더> --user-agent "<이름 연락처>"`는 제출 목록을 다시 읽어 원문만 저장하고 차단 페이지는 버린다(`--list-only`로 주소만 확인).

#### 모집단 변경 기록

`data/market/qqq-index-changes.json`에 2018~2019년 변경 10건을 추가했다. 2018년 수시 변경은 Nasdaq의 [What's New with the Nasdaq-100 (2018)](https://indexes.nasdaqomx.com/docs/Whats%20New%20with%20the%20Nasdaq-100.pdf)이 추가 PEP·NXPI·XEL, 삭제 DISH·CA·XRAY·LILA·LILAK·LVNTA로 집계한 내용과 같다. PEP/DISH(7월 23일), NXPI/CA(11월 5일), XEL/XRAY(11월 19일), 2018년 연간 변경(12월 24일, +AMD·LULU·NTAP·UAL·VRSN·WLTW, −ESRX·HOLX·QRTEA·SHPG·STX·VOD), EXC/CELG(2019년 11월 21일), 2019년 연간 변경(12월 23일, +ANSS·CDW·CPRT·CSGP·SGEN·SPLK, −HAS·HSIC·JBHT·MYL·NLOK·WYNN)은 Nasdaq 발표의 Mondo Visione 전재본을 출처로 하며 각 페이지의 본문을 읽어 종목과 발효일을 확인했다(ir.nasdaq.com 원문은 이 환경에서 403). 종목코드 변경은 2014년 LINTA→QVCA와 같은 방식으로 제외·편입 한 쌍으로 기록했다: QVCA→QRTEA(2018년 3월 12일, [Liberty Interactive·GCI Liberty 완료 발표](https://investors.qvcgrp.com/news-media/press-releases/detail/14/liberty-interactive-and-gci-liberty-announce-completion-of)), CTRP→TCOM(2019년 11월 5일, [MIAX 공지](https://www.miaxglobal.com/sites/default/files/alert-files/CTRP_Symbol_Name___45919.pdf)), SYMC→NLOK(2019년 11월 5일, [회사 발표](https://newsroom.gendigital.com/Symantec-Completes-Sale-of-Enterprise-Security-Assets-to-Broadcom)). 같은 세 건을 `data/market/qqq-ticker-changes.json`에도 두어 변경일이 속한 달의 첫·마지막 종가를 옛 코드와 새 코드로 이어서 계산한다.

LILA·LILAK의 삭제일은 발표를 찾지 못했다. Liberty Global 추적주는 2017년 12월 29일 분리(Liberty Latin America, 2018년 1월 2일 거래 시작) 뒤 Nasdaq 자료에 2018년 삭제로 집계되어 2018-01-02로 기록했다. 이미 수록된 2018년 1·2월 순위는 다시 계산하지 않았으므로 해당 두 달의 `universeCount` 106에는 두 종목이 남아 있으며(두 종목은 당시에도 가격 미확보로 제외), 재계산하면 104가 된다. LVNTA는 2018년 3월 9일 GLIBA로 상환(주식 교환)되어 `qqq-complex-actions.json`에 3월 제외 사유로 두고 3월 12일 모집단에서 뺐다. 2019년 3월 19일 Twenty-First Century Fox의 Fox Corporation 분리(FOXA·FOX 코드가 신설 회사로 이전, [S&P DJI 발표](https://press.spglobal.com/2019-03-14-Fox-Set-to-Join-S-P-500-Adobe-to-Join-S-P-100))도 복합 기업행동으로 기록해 2019년 3월 계산에서 두 주식을 제외한다. 2019년 10월 이후 분기 명세 사이의 수시 변경은 아직 기록하지 않았고, 명세 기준일을 표시한 근사 모집단으로 처리한다.

#### 아카이브 형식과 계산 절차

`scripts/market/rank_archive_portfolio.py`는 내려받기를 하지 않는다. 입력은 (1) Stooq `d_us_txt.zip` 또는 그 압축 해제 폴더(`data/daily/us/nasdaq stocks/1/aapl.us.txt`처럼 `<TICKER>,<PER>,<DATE>,<TIME>,<OPEN>,<HIGH>,<LOW>,<CLOSE>,<VOL>,<OPENINT>` 머리글, 날짜 `YYYYMMDD`, 종목 `AAPL.US`), (2) 종목별 CSV 폴더(`Date,Open,High,Low,Close,Volume` 머리글, 파일명 `aapl.us.txt`·`aapl_us_d.csv`) 중 하나다. 계산 전에 AAPL 2020-08-28 124.8075, TSLA 2020-08-28 147.56, NVDA 2024-06-07 120.888(분할 직전 종가를 이후 분할 비율로 나눈 값)과 0.5% 안에서 일치하는지 확인해 미조정 또는 배당 조정 계열을 거부하고, AAPL·MSFT·GOOG 관측일로 첫·마지막 거래일을 대조한다. 경계일 종가가 없는 종목은 `--accept-missing`으로 검토했음을 명시해야 하며 `가격 아카이브의 거래일 범위 미충족`으로 제외 집계된다. `--source-url`(기본 `https://stooq.com/db/h/`), `--price-method`, `--disclosure`(출처 이용 조건과 운영자 결정일 문장)는 결과의 `priceMethod`·`priceDisclosure`에 들어가며 월 화면이 그대로 표시한다. 합성 아카이브(폴더·ZIP)로 12종목 1개월을 계산해 두 형식의 결과가 같음을 확인했다.

```sh
python3 scripts/market/download_qqq_filings.py --out .local-research/qqq-filings --user-agent "<이름 연락처>"
python3 scripts/market/nport_to_holdings.py .local-research/qqq-filings/qqq-2024-12-31-primary_doc.xml \
  https://www.sec.gov/Archives/edgar/data/1067839/000175272425039757/primary_doc.xml --as-of 2024-12-31 \
  --out data/market/qqq-holdings-2024-12.json
python3 scripts/market/rank_archive_portfolio.py /path/to/d_us_txt.zip data/market/qqq-holdings-2024-12.json \
  --first 2025-01-02 --last 2025-01-31 --changes data/market/qqq-index-changes.json \
  --renames data/market/qqq-ticker-changes.json --actions data/market/qqq-complex-actions.json \
  --disclosure "Stooq 일별 종가 · 이용 조건 확인 중 · 운영자 YYYY-MM-DD 발표용 포함 결정"
```

2018년 3월~2019년 9월은 `qqq-holdings-2017-09.json`(2018-09-30 N-30B-2를 받으면 `qqq-holdings-2018-09.json`)에 위 변경 기록을 적용한다. 2019년 10월 이후는 직전 분기 말 N-PORT 명세를 쓴다. 연간 결과는 `--annual`로 1월 첫 거래일 모집단을 12월 마지막 거래일까지 추적한다. 수록 뒤에는 회사 발표나 당시 보도로 10건 이상의 월간 수익률을 대조해야 한다.
