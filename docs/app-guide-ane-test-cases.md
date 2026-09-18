# ધંધો એપ — સંપૂર્ણ માર્ગદર્શિકા અને ટેસ્ટ કેસ

> **આ દસ્તાવેજ કોના માટે:** એપ વાપરનાર, ટેસ્ટ કરનાર અને નવું કામ કરનાર ડેવલપર.
> **શું છે:** શરૂઆતથી દરેક સ્ક્રીન, દરેક બટન દબાવવાથી શું થાય, એની અસર ક્યાં ક્યાં દેખાય, બધા ટેસ્ટ કેસ, અને કોડમાં મળેલી જાણીતી ખામીઓ.
>
> **છેલ્લો સુધારો:** 2026-09-17 — આઇટમ કોડ અને QR લેબલ ઉમેર્યા એ ફેરફાર સાથે.
> **આધાર:** આ બધું કોડ વાંચીને લખ્યું છે. ટેસ્ટ કેસ હજી ચાલુ ડેટાબેઝ પર ચલાવ્યા નથી — ચલાવો ત્યારે નીચેના "ફેરફારની નોંધ" માં તારીખ સાથે પરિણામ લખજો.

**આ દસ્તાવેજ કેવી રીતે સાચવવો:** એપમાં કોઈ પણ બટન, સ્ક્રીન કે હિસાબનો નિયમ બદલાય, તો એ જ ફેરફાર સાથે અહીં (૧) સ્ક્રીનનું વર્ણન, (૨) "કઈ અસર ક્યાં" કોષ્ટક, (૩) ટેસ્ટ કેસ, અને (૪) છેલ્લે "ફેરફારની નોંધ" — ચારેય સુધારવાં. ખામી સુધરે તો "જાણીતી ખામીઓ" માંથી કાઢીને ફેરફારની નોંધમાં લખવું.

---

## અનુક્રમ

1. [એપનો મૂળ નિયમ — એક એન્ટ્રી, ઘણી જગ્યાએ અસર](#1)
2. [પહેલી વાર શરૂઆત — સાચો ક્રમ](#2)
3. [લોગિન, રજિસ્ટર, સાઇન આઉટ](#3)
4. [સ્ક્રીનની ગોઠવણ — સાઇડબાર, ટોપબાર, સર્ચ](#4)
5. [હોમ (ડેશબોર્ડ)](#5)
6. [પાર્ટીઝ](#6)
7. [આઇટમ્સ](#7)
8. [આઇટમ કોડ અને QR લેબલ](#8)
9. [બિલ બનાવવાનું ફોર્મ (દરેક પ્રકારનું)](#9)
10. [બિલની યાદી અને બિલ જોવાનું પેજ](#10)
11. [સેલ — દરેક પ્રકાર](#11)
12. [પરચેઝ અને એક્સપેન્સ](#12)
13. [કેશ અને બેંક](#13)
14. [એકાઉન્ટિંગ](#14)
15. [રિપોર્ટ્સ](#15)
16. [યુટિલિટીઝ](#16)
17. [સેટિંગ્સ અને બિઝનેસ પ્રોફાઇલ](#17)
18. [હજી ન બનેલી (ફક્ત માહિતીવાળી) સ્ક્રીન](#18)
19. [કઈ ક્રિયાથી ક્યાં અસર — મોટું કોષ્ટક](#19)
20. [ટેસ્ટ કેસ](#20)
21. [જાણીતી ખામીઓ](#21)
22. [ફેરફારની નોંધ](#22)

---

<a id="1"></a>
## ૧. એપનો મૂળ નિયમ — એક એન્ટ્રી, ઘણી જગ્યાએ અસર

એપમાં દરેક દસ્તાવેજ (બિલ, પેમેન્ટ, ક્રેડિટ નોટ, ખર્ચ, ઓર્ડર…) એક જ યાદીમાં સચવાય છે. દરેક દસ્તાવેજ **ત્રણ જ વસ્તુ** બદલી શકે:

| શું બદલાય | ક્યાં સચવાય | કેવી રીતે |
| --- | --- | --- |
| **પાર્ટીનું બેલેન્સ** | પાર્ટીમાં સીધું સચવાય | દસ્તાવેજ સેવ/એડિટ/ડિલીટ થતાં તરત વધે-ઘટે |
| **આઇટમનો સ્ટોક** | આઇટમમાં સીધો સચવાય | એ જ રીતે તરત |
| **રોકડ / બેંક** | ક્યાંય સચવાતું નથી | દર વખતે બધા દસ્તાવેજ પરથી ફરી ગણાય |

**પાર્ટી બેલેન્સની નિશાની:** બેલેન્સ **વત્તા** એટલે પાર્ટી પાસેથી લેવાના (*You Receive*, લીલું). **ઓછા** એટલે પાર્ટીને આપવાના (*You Pay*, લાલ).

### દરેક દસ્તાવેજની અસર

"બાકી" એટલે `ટોટલ − દસ્તાવેજ બનાવતી વખતે મળેલી/આપેલી રકમ`.

| દસ્તાવેજ | પાર્ટી બેલેન્સ | સ્ટોક | રોકડ/બેંક | સ્ટેટસ |
| --- | --- | --- | --- | --- |
| Sale Invoice | + બાકી | − જથ્થો | + મળેલી રકમ | Paid / Partial / Unpaid / Overdue |
| Purchase Bill | − બાકી | + જથ્થો | − આપેલી રકમ | એ જ |
| Payment-In | − રકમ | — | + રકમ | Paid |
| Payment-Out | + રકમ | — | − રકમ | Paid |
| Credit Note (સેલ રિટર્ન) | − બાકી | + જથ્થો | − પાછી આપેલી રકમ | Paid / Unpaid… |
| Debit Note (પરચેઝ રિટર્ન) | + બાકી | − જથ્થો | + પાછી મળેલી રકમ | Paid / Unpaid… |
| Expense | − બાકી (પાર્ટી પસંદ કરી હોય તો) | — | − આપેલી રકમ | Paid / Unpaid… |
| Party to Party (Received) | − રકમ | — | — | Paid |
| Party to Party (Paid) | + રકમ | — | — | Paid |
| Estimate, Proforma, Sale Order, Purchase Order, Delivery Challan | — | — | — | Open |
| Journal Entry | — | — | — | Open |

**ત્રણ નિયમ જે હંમેશાં સાચા રહેવા જોઈએ:**

1. **એડિટ** = જૂની અસર પાછી ખેંચો, પછી નવી લગાવો.
2. **ડિલીટ** = અસર પાછી ખેંચો.
3. **Verify My Data** બધું શરૂઆતથી ફરી ગણે — અને જવાબ ચાલુ આંકડા જેટલો જ આવવો જોઈએ.

### બે "મળેલી રકમ" — કેમ

- બિલ બનાવતી વખતે *Received* ખાનામાં લખેલી રકમ — **હિસાબ આ પરથી બને.**
- પછીથી અલગ **Payment-In** થી બિલ સામે "Settle" કરેલી રકમ — આ ફક્ત બિલનું બેલેન્સ અને સ્ટેટસ બદલે. પાર્ટી બેલેન્સ Payment-In પોતે જ ઘટાડે છે, એટલે બીજી વાર નથી ઘટતું.

બિલ પર દેખાતું *Balance* = ટોટલ − Received − Settle થયેલું.

### રોકડ અને બેંક ક્યાંથી ગણાય

- **Cash In Hand** = જે દસ્તાવેજમાં *Payment Type* `Cash` હોય એની રકમ + *Adjust Cash* ની એન્ટ્રી.
- **બેંક બેલેન્સ** = બેંક ખાતાનું ઓપનિંગ બેલેન્સ + જે દસ્તાવેજમાં એ બેંક ખાતું પસંદ કર્યું હોય એની રકમ.
- *Payment Type* `UPI`, `Cheque` વગેરે રાખીને બેંક ખાતું ન પસંદ કરો તો રકમ **ક્યાંય** નથી ગણાતી — જુઓ [KI-04](#21).

---

<a id="2"></a>
## ૨. પહેલી વાર શરૂઆત — સાચો ક્રમ

| પગલું | ક્યાં | શું કરવું | કેમ |
| --- | --- | --- | --- |
| 1 | `/register` | નામ, ઈમેલ, 8+ અક્ષરનો પાસવર્ડ → *Create account* (અથવા *Continue with Google*) | લોગિન વગર કંઈ ન ખૂલે |
| 2 | Settings → Business Profile | બિઝનેસ નામ, ફોન, GSTIN, **State**, સરનામું → *Save Profile* | State પરથી CGST+SGST કે IGST નક્કી થાય |
| 3 | Cash & Bank → Bank Accounts | બેંક ખાતું, ઓપનિંગ બેલેન્સ સાથે | બેંક બેલેન્સ સાચું આવે |
| 4 | Cash & Bank → Cash In Hand → *Adjust Cash* | હાથ પરની રોકડ *Add Cash* તરીકે | રોકડ શૂન્યથી શરૂ ન થાય |
| 5 | Items → *Add Item* (કે Import Items) | વસ્તુ, ભાવ, GST, ઓપનિંગ સ્ટોક, Min Stock | સ્ટોક અને બિલમાં ભાવ આપોઆપ આવે |
| 6 | Parties → *Add Party* (કે Import Parties) | ગ્રાહક/સપ્લાયર, State, જૂનું બાકી | બાકી રકમ સાચી દેખાય |
| 7 | Utilities → Item QR Labels | લેબલ છાપીને માલ પર ચોંટાડો | સ્કેનથી બિલ અને સ્ટોક ગણતરી |
| 8 | રોજનું કામ | Sale, Purchase, Payment-In/Out, Expense | — |
| 9 | મહિનાના અંતે | Reports → Profit And Loss, GSTR 1 | — |

> ⚠️ *Utilities → Set Up My Business* **પ્રોફાઇલ ભર્યા પછી** ન ચલાવશો — એ ઈમેલ, પિનકોડ, લોગો, સહી ભૂંસી નાખે છે. જુઓ [KI-03](#21).

---

<a id="3"></a>
## ૩. લોગિન, રજિસ્ટર, સાઇન આઉટ

### લોગિન સ્ક્રીન (`/login`)

| બટન / ખાનું | શું થાય |
| --- | --- |
| *Email*, *Password* → *Sign in* | સાચું હોય તો જે પેજ ખોલવા આવ્યા હતા ત્યાં (ન હોય તો હોમ) લઈ જાય. આખું પેજ ફરી લોડ થાય, જેથી પહેલાના યુઝરનો ડેટા ન રહે. |
| ખોટો ઈમેલ કે પાસવર્ડ | લાલ સંદેશ: *Email or password is incorrect.* (ઈમેલ છે કે નહીં એ જણાવતું નથી) |
| ગૂગલથી બનેલા ખાતામાં પાસવર્ડથી લોગિન | *This account was created with Google — use "Continue with Google".* |
| *Continue with Google* | ગૂગલનું પેજ → પાછા એપમાં. રદ કરો તો લોગિન પેજ પર *Google sign-in was cancelled.* |
| *Create one* | રજિસ્ટર પેજ |

### રજિસ્ટર (`/register`)

| બટન / ખાનું | શું થાય |
| --- | --- |
| *Your name* (2+ અક્ષર), *Email*, *Password* (8+ અક્ષર) → *Create account* | ખાતું બને અને સીધા અંદર |
| એ જ ઈમેલ ફરી | *An account with that email already exists — sign in instead.* |
| *Sign in* લિંક | લોગિન પેજ |

### સાઇન આઉટ

ટોપબારમાં જમણે છેલ્લું ગોળ બટન (નામનો પહેલો અક્ષર) → *Sign out*.
**અસર:** સર્વર સેશન બંધ, બ્રાઉઝરમાં સચવાયેલો બધો ડેટા ભૂંસાય, લોગિન પેજ ખૂલે.

**લોગિન વગર કોઈ પણ પેજ ખોલો** → લોગિન પેજ ખૂલે, અને લોગિન પછી એ જ પેજ પર પાછા લઈ જાય.
આ QR લેબલના `/i/<code>` પેજ માટે પણ લાગુ પડે છે.

> ℹ️ બધા યુઝર એક જ બિઝનેસનો હિસાબ જુએ છે — જુઓ [KI-20](#21).

---

<a id="4"></a>
## ૪. સ્ક્રીનની ગોઠવણ — સાઇડબાર, ટોપબાર, સર્ચ

### સાઇડબાર (ડાબી બાજુ)

| ભાગ | શું થાય |
| --- | --- |
| *Open Anything (Ctrl+F)* | સર્ચ પેજ. ગમે ત્યાંથી **Ctrl+F** દબાવો તો પણ આ જ ખૂલે. |
| કિનારી પરનું નાનું ગોળ બટન | સાઇડબાર સંકોચાય/પહોળો થાય. પસંદગી યાદ રહે. |
| મેનુનું નામ (જેમ કે *Sale*) | પેટા-મેનુ ખૂલે/બંધ થાય |
| પેટા-મેનુ પર માઉસ લઈ જાઓ → જમણે **+** | સીધું "નવું ઉમેરો" ફોર્મ (જેમ કે *Sale Invoices* નું **+** → નવું સેલ બિલ) |
| સૌથી નીચે બિઝનેસનું નામ | Business Profile |

**+ શોર્ટકટ ક્યાં લઈ જાય:** Party Details → નવી પાર્ટી, Items → નવી આઇટમ, દરેક સેલ/પરચેઝ દસ્તાવેજ → એનું નવું ફોર્મ, Bank Accounts → નવું ખાતું, Cash In Hand → Adjust Cash, Loan Accounts → નવી લોન.

### ટોપબાર (ઉપર)

| બટન | શું થાય |
| --- | --- |
| ડાબે બિઝનેસનું નામ (નામ ન હોય કે *My Company* હોય તો *Enter Business Name*) | Business Profile |
| *Add Sale* | નવું Sale Invoice |
| *Add Purchase* | નવું Purchase Bill |
| **+** ગોળ બટન | મેનુ: Add Payment-In, Add Payment-Out, Add Expense, Add Estimate, Add Sale Order, Add Party, Add Item |
| ⋮ ત્રણ ટપકાં | Settings, Business Profile, Verify My Data, Backup & Restore |
| નામના અક્ષરવાળું બટન | ઉપર યુઝરનું નામ (→ Settings), *Sign out* |

### Open Anything (`/search`)

- ટાઇપ કરો એટલે ત્રણ ભાગમાં પરિણામ આવે: **Parties** (નામ/ફોન/GSTIN), **Items** (નામ/આઇટમ કોડ/HSN), **Transactions** (નંબર/પાર્ટી/રેફરન્સ/પ્રકાર).
- દરેક ભાગમાં વધુમાં વધુ 8, 8 અને 10 પરિણામ.
- ટ્રાન્ઝેક્શન ફક્ત **ચાલુ નાણાકીય વર્ષ** નાં જ શોધાય.
- ટ્રાન્ઝેક્શન પર ક્લિક → એ બિલ ખૂલે.
- પાર્ટી/આઇટમ પર ક્લિક → ફક્ત યાદીનું પેજ ખૂલે, એ રેકોર્ડ પસંદ નથી થતો. જુઓ [KI-18](#21).

---

<a id="5"></a>
## ૫. હોમ (ડેશબોર્ડ) — `/`

| ખાનું | આંકડો ક્યાંથી | ક્લિક કરો તો |
| --- | --- | --- |
| **Total Receivable** | જે પાર્ટીનું બેલેન્સ વત્તા છે એનો સરવાળો | Reports → All parties |
| **Total Payable** | જે પાર્ટીનું બેલેન્સ ઓછા છે એનો સરવાળો (વત્તામાં દેખાય) | Reports → All parties |
| ઉપર જમણે Invoices / Open orders / Low stock | પસંદ કરેલા સમયનાં Sale Invoice ની સંખ્યા; Open સ્ટેટસવાળા ઓર્ડર; ઓછા સ્ટોકવાળી આઇટમ | — |
| **Total Sale** (ઉપરની હારનું કાર્ડ) | પસંદ કરેલા સમયનાં Sale Invoice નો ટોટલ + પાછલા સમય સામે % | Reports → Sale |
| **Sales Overview** + ગ્રાફ | પસંદ કરેલા સમયનાં Sale Invoice નો ટોટલ; બિલની સંખ્યા; એટલા જ લાંબા પાછલા સમય સામે % ફેર | — |
| સમયગાળો (ડ્રોપડાઉન) | Today … All Time. ફક્ત Total Sale અને ગ્રાફ બદલાય, બીજાં ખાનાં નહીં | — |
| ↻ Refresh | બધા આંકડા ફરી લાવે | — |
| **Cash In Hand** | [વિભાગ ૧](#1) મુજબ | Cash In Hand |
| **Bank Balance** | બધાં બેંક ખાતાંનો સરવાળો | Bank Accounts |
| **Stock Value** | દરેક પ્રોડક્ટ: સ્ટોક × પરચેઝ પ્રાઇસ; ઓછા સ્ટોકવાળી આઇટમ હોય તો પીળો સંદેશ *N items low on stock* | Reports → Stock summary |
| **Most Used Reports** | Sale Report, All Transactions, Daybook Report, Party Statement; *View All* → Reports | એ રિપોર્ટ |
| **WhatsApp Connect** → *Connect* | માહિતી પેજ ([વિભાગ ૧૮](#18)) | — |
| **Open Orders** | Open સ્ટેટસવાળા Sale/Purchase Order ની સંખ્યા. શૂન્ય હોય તો ખાનું જ ન દેખાય. | Sale Orders |
| *Add Widget of Your Choice* | હાલ કંઈ નથી થતું | — |

**"ઓછો સ્ટોક" એટલે:** Min Stock 0 થી વધુ હોય અને સ્ટોક ≤ Min Stock.

---

<a id="6"></a>
## ૬. પાર્ટીઝ — `/parties`

### ઉપરની પટ્ટી

| બટન | શું થાય |
| --- | --- |
| *Add Party* | નવી પાર્ટીનું ફોર્મ (`/parties?new=1` થી પણ ખૂલે) |
| ⚙️ | Settings |
| ⋮ → *Import Parties* | Utilities → Import Parties |
| ⋮ → *All Parties Report* | Reports → All parties |
| ⋮ → *Party Statement* | પસંદ કરેલી પાર્ટીનું સ્ટેટમેન્ટ |

### ડાબે — યાદી

- *Search Party Name* — નામ, ફોન કે GSTIN થી શોધે.
- કોલમ *Party Name* (નીચે ફોન) અને *Amount*: લીલું = લેવાના, લાલ = આપવાના, ગ્રે = શૂન્ય.
- કોલમના નામ પર ક્લિક → ક્રમ બદલાય; ફિલ્ટર આઇકન → ફિલ્ટર.
- કોઈ પાર્ટી પસંદ ન કરી હોય તો પહેલી પાર્ટી આપોઆપ પસંદ થાય.
- નીચે લીલું ખાનું → Import Parties.

### જમણે — પસંદ કરેલી પાર્ટી

| ભાગ | શું થાય |
| --- | --- |
| નામ પાસે ✏️ | પાર્ટી એડિટ |
| Phone Number, GSTIN, *You Receive*/*You Pay*, Credit Limit | ફક્ત માહિતી |
| 💬 WhatsApp (ફોન હોય તો જ દેખાય) | `wa.me/91<ફોન>` નવા ટેબમાં |
| 📄 | Party Statement, આ પાર્ટી સાથે |
| ⋮ → *Add Sale Invoice* | નવું સેલ બિલ, **આ પાર્ટી પહેલેથી ભરેલી** |
| ⋮ → *Add Payment-In* | નવું Payment-In, આ પાર્ટી ભરેલી |
| ⋮ → *Edit Party* / *Delete Party* | એડિટ / ખાતરી પછી ડિલીટ |
| *Transactions* યાદી | આ પાર્ટીના બધા દસ્તાવેજ. લાઇન પર ક્લિક → બિલ; ⋮ → *View / Print*, *Edit* |
| *Add Sale* | નવું સેલ બિલ, પાર્ટી ભરેલી |

### Add / Edit Party ફોર્મ

| ખાનું | નિયમ |
| --- | --- |
| Party Name | ફરજિયાત |
| Phone Number | ભરો તો 6–15 અંક/`+`/`-`/space |
| Party Type | Customer / Supplier / Both |
| **ટેબ GST & Address:** GSTIN | 15 અક્ષર, ફોર્મેટ ચકાસાય, આપોઆપ કેપિટલ |
| GST Type, State, Email, Billing Address | State થી GST નો પ્રકાર નક્કી થાય |
| **ટેબ Shipping Address:** Shipping Address, Party Group | Group ખાલી હોય તો `General` |
| **ટેબ Credit & Balance:** Opening Balance + *To Receive / To Pay* સ્વિચ, As of Date, Credit Limit | — |

**સેવ કરતાં અસર:**

- **નવી પાર્ટી:** બેલેન્સ = ઓપનિંગ (*To Pay* હોય તો ઓછા). ડેશબોર્ડ Receivable/Payable તરત બદલાય.
- **એડિટમાં ઓપનિંગ બદલો:** બેલેન્સ એટલા ફરકથી ખસે, બાકીના વ્યવહારની અસર એમ ની એમ રહે.
- **Credit Limit** ફક્ત સચવાય અને દેખાય; હજી ચેતવણી નથી આપતી ([KI-08](#21)).

**ડિલીટ:** પાર્ટીનો એક પણ દસ્તાવેજ હોય તો *This party has transactions. Delete those first, or mark the party inactive.*

---

<a id="7"></a>
## ૭. આઇટમ્સ — `/items`

ઉપર ચાર ટેબ: **Products**, **Services**, **Category**, **Units**.

### Products / Services — ડાબી યાદી

| બટન | શું થાય |
| --- | --- |
| 🔍 | સર્ચ ખાનું ખૂલે (નામ, આઇટમ કોડ, HSN) |
| ⌖ Scan (સર્ચ પાસે) | કેમેરા ખૂલે; લેબલ સ્કેન થાય એટલે એ આઇટમનું મોબાઇલ પેજ ([વિભાગ ૮](#8)) |
| *Add Item* / *Add Service* | નવી આઇટમ ફોર્મ |
| *Add Item* પાસેનું ⌄ → *Import Items* | Utilities → Import Items |
| ⋮ → *Bulk Inactive* / *Bulk Active* | હાલ ફક્ત સંદેશ દેખાય ([KI-19](#21)) |
| ⋮ → *Assign Units* | Units ટેબ |
| ⋮ → *Bulk Update Items* | માહિતી પેજ |
| ⋮ → *Export Items* | Utilities → Export |
| ⋮ → *Print QR Labels* | Utilities → Item QR Labels |
| લાઇન પર ક્લિક | જમણે વિગત |
| *Quantity* રંગ | લીલો = બરાબર, પીળો = Min Stock કે નીચે, લાલ = માઇનસ; Service માટે "—" |
| લાઇનનું ⋮ | *Edit Item*, *QR Code & Labels*, *Adjust Stock* (ફક્ત Product), *Mark Inactive/Active*, *Delete* |

### જમણે — વિગત

- નામ, નીચે **આઇટમ કોડ**.
- Sale Price, Purchase Price — *(incl)* = ભાવમાં ટેક્સ સામેલ, *(excl)* = ટેક્સ અલગ.
- Stock Quantity, Stock Value (સ્ટોક × પરચેઝ પ્રાઇસ) — ફક્ત Product માટે.
- HSN/SAC, GST.
- **નાનો QR** → QR મોડલ.
- *ADJUST ITEM* (ફક્ત Product) → Stock Adjustment.
- *Edit* → ફોર્મ.
- *Transactions* યાદી: આ આઇટમ જે દસ્તાવેજમાં આવી એ બધા. પીળું ટપકું = સ્ટોક અંદર, લીલું = બહાર. લાઇન પર ક્લિક → બિલ.

### Add / Edit Item ફોર્મ

| ખાનું | નિયમ / અસર |
| --- | --- |
| Item Name | ફરજિયાત |
| Type | Product / Service. **એડિટમાં બદલી ન શકાય.** |
| **Item Code** | ખાલી રાખો → `ITM` + 5 અંકનો id (જેમ કે `ITM00042`). બીજી આઇટમનો કોડ (નાના-મોટા અક્ષરનો ફેર ગણ્યા વગર) → ભૂલ. વિગત [વિભાગ ૮](#8). |
| HSN/SAC Code, Unit, Category | — |
| New Category → *Add* (કે Enter) | કેટેગરી બને અને તરત પસંદ થાય |
| **ટેબ Pricing:** Sale Price, Purchase Price, બંને નીચે *Tax included in price* | બિલમાં આ જ ભાવ અને ટિક આપોઆપ આવે |
| GST Tax Rate | 0, 0.25, 3, 5, 12, 18, 28 |
| Default Discount (%) | બિલમાં આઇટમ પસંદ થતાં આ ડિસ્કાઉન્ટ આવે |
| Description | — |
| **ટેબ Stock** (Service માટે *Details*): Opening Quantity, At Price, As of Date, Min Stock to Maintain, Item Location | Service માં ઓપનિંગ હંમેશાં 0 |

**સેવ કરતાં અસર:**

- **નવી આઇટમ:** સ્ટોક = Opening Quantity. ડેશબોર્ડ Stock Value વધે. ઓપનિંગ × At Price એ P&L નો Opening Stock.
- **એડિટમાં Opening Quantity બદલો:** ચાલુ સ્ટોક એટલા ફરકથી ખસે (જેમ કે ઓપનિંગ 12→15 હોય તો સ્ટોક +3).
- **Mark Inactive:** આઇટમ બિલના ડ્રોપડાઉનમાં અને સ્કેનમાં ન આવે; યાદીમાં રહે.
- **Delete:** કોઈ દસ્તાવેજમાં વપરાઈ હોય તો *This item is used in transactions. Mark it inactive instead of deleting.*

### Stock Adjustment

| ખાનું | નિયમ |
| --- | --- |
| ઉપર સ્વિચ *Add Stock* / *Reduce Stock* | — |
| Adjustment Date, *In stock: N* દેખાય | — |
| Total Qty | 0 થી વધુ ફરજિયાત; ઘટાડતી વખતે હાજર સ્ટોકથી વધુ ન ચાલે (*Only N in stock — cannot reduce by M*) |
| At Price, Details | કારણ લખવું |

**અસર:** સ્ટોક તરત વધે/ઘટે, ડેશબોર્ડ Stock Value અને Low stock બદલાય, Stock summary રિપોર્ટ બદલાય. પાર્ટી/રોકડ પર અસર **નહીં**.

### Category ટેબ

- *Add Category* → નામ → Save.
- 🗑️ → કાઢી નાખે. એ કેટેગરીની આઇટમ *Uncategorised* થાય.
- *Items* કોલમ = એમાં કેટલી આઇટમ.

### Units ટેબ

એપ પહેલેથી 18 યુનિટ આપે છે (Pcs, Kg, Ltr, Box…). *Add Unit* → Unit Name + Short Name (બંને ફરજિયાત). યુનિટ કાઢી શકાતા નથી.

---

<a id="8"></a>
## ૮. આઇટમ કોડ અને QR લેબલ

### નિયમ

- **દરેક આઇટમનો કોડ હોય જ.** ખાલી રાખો → `ITM00042` જેવો. એવો કોડ કોઈએ હાથે લખ્યો હોય તો `ITM00042-2`.
- **એક બિઝનેસમાં કોડ અનોખો**, નાના-મોટા અક્ષરનો ફેર ગણ્યા વગર (`pen-blu` = `PEN-BLU`). આગળ-પાછળની જગ્યા કપાઈ જાય.
- નવી આઇટમ, એડિટ અને **Import Items** — ત્રણેયમાં આ નિયમ લાગે.
- એડિટમાં કોડ ખાલી કરો → ફરી `ITM<id>` બને.
- **QR ની અંદર લિંક છે:** `<એપનું સરનામું>/i/<કોડ>`. ભાવ QR માં **નથી**, એટલે ભાવ બદલાય તો પણ છાપેલો QR ખોટો ન પડે. (લેબલ પર છાપેલો ભાવ લખાણ છે, એ જૂનો થઈ શકે.)
- લોકલહોસ્ટ પરથી છાપો તો `.env` માં `NEXT_PUBLIC_APP_URL` સેટ કરવું, નહીં તો ફોનમાં લિંક ન ખૂલે.

### QR મોડલ — આઇટમની વિગતમાં નાનો QR, અથવા ⋮ → *QR Code & Labels*

| ભાગ | શું થાય |
| --- | --- |
| મોટો ચોરસ QR, નામ, કોડ, લિંક | — |
| *Download* | `<કોડ>-qr.png` ઊતરે |
| *Print Labels…* | Utilities → Item QR Labels ખૂલે, **આ આઇટમ ટિક થયેલી** (Copies 1) |

### Utilities → Item QR Labels (`/utilities/barcode`) — લેબલ છાપવાનું એક જ ઠેકાણું

**ડાબે — આઇટમ પસંદ કરો:**

| ભાગ | શું થાય |
| --- | --- |
| યાદી | ફક્ત **Active** અને કોડવાળી આઇટમ |
| *Search by name or code* | — |
| આઇટમની સામે ☑️ | Copies આપોઆપ = સ્ટોક (Product અને સ્ટોક ≥ 1 હોય તો, દશાંશ કાપીને), નહીં તો 1 |
| *Copies* | ટિક ન હોય ત્યાં સુધી બંધ; 0 લખો તો એ આઇટમનાં લેબલ ન છપાય |
| *Select all* / *Select shown* | દેખાતી બધી ટિક/અનટિક |
| URL `?item=<id>` | એ આઇટમ ટિક થઈને ખૂલે |

**જમણે — કેવી રીતે છાપવું:**

| ભાગ | શું થાય |
| --- | --- |
| **Label stock** | લેબલ કયા કાગળ પર છાપવાં — નીચેનું કોષ્ટક. પસંદ કરતાં માપ બદલાય, *Skip used labels* 0 થાય. |
| માપની લાઇન (જેમ કે `50 × 25 mm · 1 across · 2 mm gap`) + *Edit sizes* | Type (Label roll / Continuous roll / Sheet), Label width, Label height, Across, Rows (sheet), Gap across, Gap (die-cut) / Feed between / Gap down, Liner edge / Left margin, Top margin અને Paper A4/Letter (sheet). **કોઈ પણ માપ બદલો એટલે Label stock *Custom size…* થાય.** માન્ય સીમા બહારનો આંકડો સ્વીકારાતો નથી; ખાનું છોડો એટલે છેલ્લો સાચો આંકડો પાછો આવે. |
| **On the label** | Item name, Item code, Sale price, Business name (ડિફોલ્ટ: પહેલા ત્રણ) |
| **QR holds** | *Link to the item* (ફોનથી ખૂલે; ડિફોલ્ટ) / *Item code only* (નાનો QR, મોટાં ખાનાં; ફક્ત સ્કેનર માટે — ફોન કેમેરો ફક્ત કોડ બતાવે) |
| **Printer** | Thermal 203 dpi (ડિફોલ્ટ) / Thermal 300 dpi / Laser-inkjet |
| *Alignment and advanced* | *Move right* / *Move down* (−10 થી +10 mm; ઓછા = ડાબે/ઉપર), *Skip used labels* (sheet: પહેલી શીટનાં વપરાયેલાં ખાનાં), *Error correction* L / M (ડિફોલ્ટ) / Q, *Print label outlines* |
| **Preview** | સાચા mm માપનું પૂર્વદર્શન: roll માં પહેલી 3 હાર, sheet માં પહેલી શીટ. કશું ટિક ન હોય તો *Sample preview*. ઉપર: કેટલાં લેબલ, કેટલી હાર/શીટ. |
| ચેતવણીઓ | લાલ = છાપવાનું બંધ; પીળી = ધ્યાન; ભૂરી = સૂચન. નીચે જુઓ. |
| *Print N labels* | છુપા ફ્રેમમાંથી પ્રિન્ટ ડાયલોગ (પોપ-અપ નહીં). કશું ટિક ન હોય કે લાલ ચેતવણી હોય તો બંધ. |
| *Print alignment test* | એક પેજ: દરેક લેબલની ડેશવાળી કિનારી, વચ્ચે +, ક્રમ નંબર, માપ. પહેલા સાદા કાગળ પર છાપીને ગોઠવણ તપાસો. |
| ભાષા (*TSPL file* / *ZPL file*) + *File* | પ્રિન્ટર માટેની કમાન્ડ ફાઇલ: `item-labels-50x25.prn` (TSPL) કે `.zpl`. ફક્ત gap-વાળા label roll અને 203/300 dpi માટે; નહીં તો કારણ લખેલું દેખાય. |
| *Printer and print-dialog settings* | stock ના પ્રકાર મુજબ પ્રિન્ટ ડાયલોગમાં શું રાખવું એનાં પગલાં |

**પસંદગી યાદ રહે:** *Print*, *Print alignment test* કે *File* દબાવતાં બધી પસંદગી (stock, માપ, content, printer, offset) બિઝનેસ માટે સચવાય (setting `label_print_config`). બીજા કમ્પ્યુટર પર પણ એ જ ખૂલે.

**તૈયાર Label stock:**

| જૂથ | વિકલ્પ | લેબલ | એક હાર/શીટમાં |
| --- | --- | --- | --- |
| Thermal label roll (2 mm gap) | 50 × 25 — 1 across | 50 × 25 | 1 |
| | 38 × 25 — 2 across (80 mm roll) | 38 × 25, વચ્ચે 2 mm, કિનારે 1 mm | 2 |
| | 25 × 25 — 3 across | 25 × 25, વચ્ચે 2 mm | 3 |
| | 50 × 38, 50 × 50, 75 × 50, 100 × 50, 100 × 150 | — | 1 |
| Receipt printer roll (continuous, 4 mm feed) | 58 mm paper | 48 × 40 | 1 |
| | 80 mm paper | 72 × 50 | 1 |
| A4 sticker sheet (Avery માપ, પેજની વચ્ચે) | 65 — 38.1 × 21.2 (L7651) | 5 × 13 | 65 |
| | 40 — 45.7 × 25.4 (L7654) | 4 × 10 | 40 |
| | 24 — 64 × 33.9 (L7159) | 3 × 8 | 24 |
| | 21 — 63.5 × 38.1 (L7160) | 3 × 7 | 21 |
| | 14 — 99.1 × 38.1 (L7163) | 2 × 7 | 14 |
| | 8 — 99.1 × 67.7 (L7165) | 2 × 4 | 8 |

**લેબલની ગોઠવણ (આપોઆપ):**

- લેબલ પહોળાઈ ÷ ઊંચાઈ **≥ 1.25** → QR ડાબે, લખાણ જમણે (નામ 3 લાઇન સુધી). નહીં તો QR ઉપર, લખાણ નીચે વચ્ચે (નામ 2 લાઇન સુધી; QR ઓછામાં ઓછું અડધું લેબલ).
- કિનારી = નાની બાજુના 6% (1 થી 2.5 mm).
- લખાણ ન સમાય તો ક્રમમાં: નામની લાઇન ઓછી → Business name કાઢો → અક્ષર નાના (1.6 mm સુધી) → પછી પણ ન સમાય તો પીળી ચેતવણી.
- **QR નું માપ પ્રિન્ટરનાં ટપકાં મુજબ:** 203 dpi પર એક ટપકું 0.125 mm. QR નું દરેક ખાનું પૂરાં ટપકાં જેટલું રખાય (જેમ કે 5 ટપકાં = 0.625 mm), જેથી ખાનાં એકસરખાં અને સ્કેન ભરોસાપાત્ર. એટલે QR જગ્યા કરતાં થોડો નાનો દેખાય એ સાચું છે. Laser/inkjet માં આખી જગ્યા વપરાય.
- ગુજરાતી નામ બ્રાઉઝર પ્રિન્ટમાં બરાબર છપાય.

**ચેતવણીઓ:**

| સ્તર | ક્યારે | સંદેશ (ટૂંકમાં) |
| --- | --- | --- |
| લાલ | QR નું ખાનું 2 ટપકાંથી નાનું (thermal) | *The QR is too dense for a … dpi printer…* |
| લાલ | Sheet માં લેબલ પેજ બહાર જાય | *Labels run off the page…* |
| લાલ | 2000 થી વધુ લેબલ | *Print at most 2000 labels at a time.* |
| પીળી | QR ખાનું 0.3 mm થી નાનું | *…Phone cameras struggle below 0.3 mm…* |
| પીળી | QR 10 mm થી નાનો | *The QR prints … mm wide. Aim for at least 10 mm.* |
| પીળી | લખાણ નાનામાં નાના અક્ષરે પણ ન સમાય | *The text does not fit…* |
| પીળી | Roll 108 mm થી પહોળો (thermal) | *…4-inch desktop label printers print at most 104–108 mm.* |
| ભૂરી | Link QR નું ખાનું 0.4 mm થી નાનું અને Code only થી 15%+ મોટું થાય | *“Code only” QR would make each square…* |
| ભૂરી | Business name ન સમાયું | *The business name does not fit…* |
| ભૂરી | Sheet ની કિનારી 3 mm થી ઓછી | *Most office printers cannot print within 3–4 mm…* |

**છાપવાની ચાર રીત:**

1. **Label printer (TSC, TVS, Zebra, Godex, Xprinter) — બ્રાઉઝરથી:** Windows માં એક વાર Printer Preferences → Page Setup/Stock માં લેબલ માપ + gap બનાવો, media *Gap/Web sensing*. પ્રિન્ટરને calibrate કરો (FEED બટન). પ્રિન્ટ ડાયલોગમાં Margins *None*, Scale *100%*, Headers and footers બંધ. દરેક લાઇન/હાર = એક પેજ.
2. **Label printer — TSPL/ZPL ફાઇલથી (સૌથી સાફ QR):** પ્રિન્ટર પોતે QR બનાવે. ફાઇલ પ્રિન્ટરની યુટિલિટીથી મોકલો (TSC Console / Zebra Setup Utilities → Send file) અથવા પ્રિન્ટર share કરીને `copy /b item-labels.prn \\localhost\<share-name>`. **ફાઇલમાં ફક્ત અંગ્રેજી અક્ષર** — ગુજરાતી નામ નીકળી જાય, ₹ ની જગ્યાએ `Rs.`. Offset: TSPL માં આડું ખસેડવું coordinates માં, ઊભું `SHIFT` થી; ZPL માં coordinates માં (0 થી ઓછું નહીં).
3. **A4 sticker sheet — ઓફિસ પ્રિન્ટરથી:** Paper A4, Margins None, Scale 100% (*Fit to page* નહીં). સાદા કાગળ પર alignment test → શીટ પર મૂકી અજવાળામાં જુઓ → Move right/down સુધારો. અડધી વપરાયેલી શીટ માટે *Skip used labels*.
4. **Receipt printer (58/80 mm):** Paper = રોલ, Margins None, Scale 100%. TSPL/ZPL નથી (એ ESC/POS વાપરે).

### ફોનથી સ્કેન — મોબાઇલ પેજ `/i/<કોડ>`

ફોનના કેમેરાથી લેબલ સ્કેન કરો → લિંક ખૂલે → (લોગિન ન હોય તો લોગિન → પાછા અહીં).

| ભાગ | શું થાય |
| --- | --- |
| ઉપર *← Items* | Items પેજ |
| *Scan next* | એપની અંદરથી કેમેરા → બીજી આઇટમનું પેજ |
| નામ, કોડ, Product/Service, કેટેગરી, *Inactive* | — |
| **In stock** (મોટા અક્ષરે) | લીલો / પીળો (Min Stock કે નીચે, નીચે સંદેશ) / લાલ (માઇનસ) — ફક્ત Product |
| Sale price, Purchase price, GST, HSN, Location | — |
| QR બટન | QR મોડલ (ડાઉનલોડ / પ્રિન્ટ) |
| *Sell* | નવું Sale Invoice, **પહેલી લાઇનમાં આ આઇટમ, qty 1, સેલ પ્રાઇસ** |
| *Purchase* | નવું Purchase Bill, પહેલી લાઇનમાં આ આઇટમ, **પરચેઝ પ્રાઇસ** |
| *Adjust stock* (ફક્ત Product) | Stock Adjustment; સેવ થતાં આંકડો તરત બદલાય |
| *Recent transactions* | છેલ્લા 5 દસ્તાવેજ; ક્લિક → બિલ |
| કોડની કોઈ આઇટમ નથી | *No item found* + *Scan again* |

આ પેજ પર સાઇડબાર/ટોપબાર નથી — ફોન માટે બનાવેલું છે.

### બિલમાં સ્કેન — Sale/Purchase/… ફોર્મ

આઇટમ ટેબલની ઉપર સ્કેન પટ્ટી. (Expense ફોર્મમાં નથી. Settings → Item → *QR / barcode scanning* બંધ કરો તો છુપાઈ જાય.)

| ક્રિયા | શું થાય |
| --- | --- |
| USB/Bluetooth સ્કેનરથી લેબલ સ્કેન (સ્કેનર કોડ ટાઇપ કરીને Enter દબાવે) | આઇટમ ઉમેરાય: જે લાઇનમાં એ આઇટમ હોય એની qty +1, નહીં તો પહેલી ખાલી લાઇનમાં, નહીં તો નવી લાઇન. ભાવ, ટેક્સ, ડિસ્કાઉન્ટ આઇટમ મુજબ (પરચેઝ બાજુ પરચેઝ પ્રાઇસ). |
| હાથથી કોડ ટાઇપ + Enter | એ જ |
| આખી લેબલ લિંક પેસ્ટ + Enter | એ જ (લિંકમાંથી કોડ કાઢી લે) |
| પ્રોડક્ટ પર છપાયેલો બારકોડ (EAN) | આઇટમ કોડમાં એ જ નંબર હોય તો ઉમેરાય |
| કોડ ન મળે / આઇટમ Inactive | લાલ: *No active item has the code "X"* |
| પટ્ટીમાં જમણે સંદેશ | લીલો: *<નામ> × <qty>* |
| *Camera* | કેમેરા ચાલુ રહે; એક પછી એક સ્કેન થાય; એ જ લેબલ 2.5 સેકન્ડ સુધી ફરી ન ગણાય; *Done* થી બંધ |

**કેમેરાના સંદેશ:** પરવાનગી ન આપી → *Camera permission was denied…*; કેમેરા નથી → *No camera was found on this device.*; https ન હોય (localhost સિવાય) → *The camera only works when the app is opened over https.*

**કઈ ટેક્નોલોજી:** Chrome/Android માં બ્રાઉઝરનું પોતાનું સ્કેનર (QR ઉપરાંત EAN/UPC/Code128 પણ વાંચે). બીજે (જેમ કે iPhone Safari) ફક્ત QR.

### જૂના ડેટાબેઝમાં અપગ્રેડ

એક વાર `npm run db:item-codes` (ખાલી કોડ ભરે, સરખા કોડમાં `-<id>` ઉમેરે), પછી `npm run db:push`.

---

<a id="9"></a>
## ૯. બિલ બનાવવાનું ફોર્મ — `/txn/new/<પ્રકાર>`

બધા દસ્તાવેજ (Sale, Purchase, Credit/Debit Note, Estimate, Orders, Challan, Expense, Journal, Party to Party) આ એક જ ફોર્મ વાપરે છે. પ્રકાર મુજબ અમુક ભાગ દેખાય કે છુપાય.

### ઉપર

| બટન | શું થાય |
| --- | --- |
| ← | પાછળના પેજ પર (સેવ કર્યા વગર) |
| *Save & New* (ફક્ત નવા દસ્તાવેજમાં) | સેવ + ફોર્મ ખાલી, નંબર +1 |
| *Save* | સેવ → એ દસ્તાવેજનું પેજ ખૂલે. એડિટમાં: *<પ્રકાર> updated* |

**સેવ ન થાય જો:** પાર્ટી ન હોય (*Select or type a party name*), તારીખ ન હોય, એક પણ આઇટમ લાઇન ન હોય (*Add at least one item*), કોઈ લાઇનમાં qty 0 (*Every line needs a quantity*), Expense માં કેટેગરી ન હોય, Payment માં રકમ 0. ઉપર *Please fix the highlighted fields*.

### પહેલું ખાનું — પાર્ટી અને તારીખ

| ખાનું | નિયમ |
| --- | --- |
| *Customer* / *Supplier* | ટાઇપ કરો → યાદી (નીચે ફોન, જમણે *Recv*/*Pay* બાકી). *Add new party* → અહીં જ પાર્ટી ફોર્મ, સેવ થતાં પસંદ. **યાદીમાં ન હોય એવું નામ ટાઇપ કરીને પણ સેવ થાય**, પણ પછી કોઈ પાર્ટી બેલેન્સ નહીં બદલાય. |
| *<પ્રકાર> No.* | આપોઆપ = એ પ્રકારનો સૌથી મોટો નંબર + 1. બદલી શકાય. નવા દસ્તાવેજમાં પહેલેથી વપરાયેલો નંબર લખો તો **ચૂપચાપ પછીનો ખાલી નંબર** લાગે. એડિટમાં વપરાયેલો નંબર લખો તો *That record already exists — try a different number or name.* |
| *Date* | આજની |
| *Payment Terms (days)* | દિવસ લખો → *Due Date* = તારીખ + દિવસ (0 → એ જ તારીખ). Payment અને Open દસ્તાવેજમાં નથી. |
| *Due Date* | જાતે પસંદ કરો તો Terms ની અસર બંધ |
| *Reference No.* | મરજિયાત |
| *Expense Category* (ફક્ત Expense) | ફરજિયાત |

### બીજું ખાનું — આઇટમ લાઇન

| કોલમ | નિયમ |
| --- | --- |
| સ્કેન પટ્ટી | [વિભાગ ૮](#8) |
| ITEM | ટાઇપ → Active આઇટમની યાદી (કોડ, ભાવ, સ્ટોક). પસંદ કરો → HSN, Unit, ભાવ (સેલ બાજુ Sale Price, પરચેઝ/ઓર્ડર/ડેબિટ નોટ બાજુ Purchase Price), incl. tax ટિક, GST, ડિફોલ્ટ ડિસ્કાઉન્ટ, qty 1 ભરાય. *Add new item* → આઇટમ ફોર્મ. યાદી બહારનું નામ પણ ચાલે (પણ સ્ટોક પર અસર નહીં). |
| HSN, QTY, UNIT, PRICE/UNIT | બદલી શકાય |
| *incl. tax* | ભાવમાં ટેક્સ સામેલ |
| DISCOUNT + **% / ₹ ડ્રોપડાઉન** | નવી લાઇનમાં ડિફોલ્ટ **%**. જે લખ્યું એ સાચું; બીજું નીચે નાના અક્ષરે. ડ્રોપડાઉનમાં મોડ બદલતાં રકમ બદલાતી નથી. |
| TAX | GST દર |
| AMOUNT | ટેક્સ સાથે |
| ✕ | લાઇન કાઢે (છેલ્લી હોય તો ખાલી થાય) |
| *Add Row* | નવી ખાલી લાઇન |

### ગણતરીના નિયમ (ફોર્મમાં દેખાય એ જ સેવ થાય)

1. **ટેક્સ વગરનો એકમ ભાવ** = incl. tax હોય તો `ભાવ ÷ (1 + દર/100)`, નહીં તો ભાવ.
2. **Gross** = એકમ ભાવ × qty (2 દશાંશ).
3. **Discount** = % હોય તો Gross × % ; ₹ હોય તો એ રકમ. Gross થી વધુ ન થાય.
4. **Taxable** = Gross − Discount. **Tax** = Taxable × દર. **Line total** = Taxable + Tax.
5. **Subtotal** = બધી લાઇનનો Taxable.
6. **બિલ પરનું Discount** (% કે ₹) Subtotal પર લાગે, અને **ટેક્સ એટલા જ પ્રમાણમાં ઘટે**.
7. **Additional Charges** ઉમેરાય (એના પર ટેક્સ નહીં).
8. **Round Off** (ડિફોલ્ટ ટિક) → નજીકના પૂરા રૂપિયામાં (.50 ઉપર જાય).
9. **Received/Paid** ટોટલથી વધુ લખો તો પણ ટોટલ જેટલું જ સચવાય.
10. **Balance Due** = ટોટલ − Received. લાલ = બાકી, લીલું = ચૂકતે.
11. ટેક્સ નીચે **CGST x% + SGST x%** દેખાય. છાપેલા બિલમાં બિઝનેસ અને પાર્ટીનું State અલગ હોય તો **IGST**; બેમાંથી એક પણ State ખાલી હોય તો CGST+SGST.

### ત્રીજું ખાનું — ચુકવણી અને સરવાળો

| ખાનું | નિયમ |
| --- | --- |
| Description | છાપેલા બિલમાં આવે |
| Discount (જમણે, Subtotal નીચે) + **₹ / % ડ્રોપડાઉન** | બિલ પરનું ડિસ્કાઉન્ટ. નવા બિલમાં ડિફોલ્ટ **₹**; સેવ થયેલું બિલ ખોલો તો જે મોડમાં લખ્યું હતું એ જ. મોડ બદલતાં રકમ બદલાતી નથી (આંકડો નવા મોડમાં ફેરવાય). |
| Payment Type | Cash, Cheque, Bank Account, UPI, Card, NEFT/RTGS. **Cash સિવાય** બાજુમાં *Bank Account* પસંદ કરવાનું ખાનું. |
| રકમ શબ્દોમાં | ટોટલ 0 થી વધુ હોય ત્યારે |
| *Received* (સેલ બાજુ) / *Paid* (પરચેઝ, Expense) | — |
| *Mark as fully paid* | Received = ટોટલ, ખાનું બંધ |

### સ્ટેટસ કેવી રીતે નક્કી થાય (સેવ વખતે)

| શરત | સ્ટેટસ |
| --- | --- |
| બાકી ≤ 0 | **Paid** |
| કંઈક મળ્યું, Due Date આજથી પહેલાંની | **Overdue** (સાથે દિવસ) |
| કંઈક મળ્યું, ડ્યુ નથી | **Partial** |
| કંઈ નથી મળ્યું, Due Date આજથી પહેલાંની | **Overdue** |
| કંઈ નથી મળ્યું | **Unpaid** |
| Estimate/Order/Proforma/Challan/Journal | **Open** |
| Payment-In/Out, Party to Party | **Paid** |

> ⚠️ સ્ટેટસ **સેવ વખતે જ** નક્કી થાય. આજે Unpaid સેવ કરેલું બિલ Due Date વીત્યા પછી આપોઆપ Overdue **નથી** થતું ([KI-05](#21)).

### Payment-In / Payment-Out ફોર્મ

| ખાનું | નિયમ |
| --- | --- |
| Customer/Supplier, Receipt No., Date, Reference No. | — |
| *Amount* | 0 થી વધુ ફરજિયાત |
| Payment Type, Bank Account | ઉપર મુજબ |
| **Settle against open invoices/bills** | પાર્ટી પસંદ કરતાં જ એનાં બાકી (Unpaid/Partial/Overdue) બિલ દેખાય — No., Date, Total, Due. *Settle* માં રકમ લખો. ખાલી → રકમ એડવાન્સ તરીકે જમા. |
| Description | — |

**Settle ની અસર:** બિલનું Settled વધે, Balance ઘટે, સ્ટેટસ ફરી ગણાય. **પાર્ટી બેલેન્સ પર બીજી અસર નહીં** (Payment પોતે ઘટાડી ચૂક્યું છે). એક બિલમાં એના બાકીથી વધુ Settle ન થાય. Settle નો સરવાળો Payment ની રકમથી વધુ હોય તો પણ એપ રોકતી નથી.

### ડુપ્લિકેટ અને કન્વર્ટ

- **Duplicate** (`?duplicate=<id>`): પાર્ટી, લાઇન, ડિસ્કાઉન્ટ, પેમેન્ટ ટાઇપ, નોટ્સ કોપી થાય. **તારીખ આજની, નંબર નવો, Received ખાલી.**
- **Convert** (`/txn/new/sale?convert=<id>`): Estimate/Proforma/Sale Order/Challan → Sale Invoice; Purchase Order → Purchase Bill. વિગત ભરેલી, નવા દસ્તાવેજમાં મૂળનો સંદર્ભ સચવાય. **મૂળ દસ્તાવેજ Open જ રહે** ([KI-06](#21)).
- **Preset:** `?partyId=<id>` → પાર્ટી ભરેલી; `?item=<id>` → પહેલી લાઇનમાં આઇટમ.

---

<a id="10"></a>
## ૧૦. બિલની યાદી અને બિલ જોવાનું પેજ

### યાદી (Sale Invoices, Purchase Bills, Payment-In… બધા સરખા)

| ભાગ | શું થાય |
| --- | --- |
| *Add …* | નવું ફોર્મ |
| 🔍 | સર્ચ પટ્ટી: પાર્ટી, નંબર, રેફરન્સ, વર્ણન |
| ⚙️ | Settings |
| *Filter by* ડ્રોપડાઉન + From/To | સમયગાળો. **દરેક સ્ક્રીનનો અલગ યાદ રહે**, રીલોડ પછી પણ. તારીખ જાતે બદલો → *Custom*. |
| સ્ટેટસ ડ્રોપડાઉન (Credit/Debit Note, Sale/Purchase Order) | All Payment, Unpaid/Unused (Partial અને Overdue પણ સાથે), Partial, Paid/Used, Overdue, Cancelled |
| *Excel Report* | દેખાતી લાઇનો **CSV** ફાઇલમાં |
| *Print* | આખું પેજ છાપે |
| સરવાળાનું ખાનું (Open દસ્તાવેજમાં નથી) | Total, Received (= Received + Settle), Balance — **સમયગાળા મુજબ, સ્ટેટસ/સર્ચ ફિલ્ટર વગર** |
| લાઇન પર ક્લિક | દસ્તાવેજ પેજ |
| 🖨️ | દસ્તાવેજ પેજ ખૂલે અને પ્રિન્ટ ડાયલોગ આપોઆપ |
| Share આઇકન | દસ્તાવેજ પેજ ખોલે |
| ⋮ | *View*, *Edit*, *Duplicate*, (*Convert to Sale Invoice* / *Convert to Purchase Bill*), *Delete* |
| *Delete* | ખાતરી: *Stock and balances will be reversed.* → બધી અસર પાછી |
| નીચે | Total, Balance |

### દસ્તાવેજ પેજ (`/txn/<id>`)

| બટન | શું થાય |
| --- | --- |
| ←, શીર્ષક *<પ્રકાર> #<નંબર>*, સ્ટેટસ | — |
| *Share* | ફોનમાં શેર શીટ; કમ્પ્યુટરમાં લિંક કોપી (*Link copied to clipboard*) |
| *Duplicate*, *Edit* | ઉપર મુજબ |
| *Delete* | ખાતરી → અસર પાછી → એ પ્રકારની યાદી |
| *Print* | ફક્ત બિલ છપાય (સાઇડબાર/બટન નહીં) |

**છાપેલા બિલમાં:** બિઝનેસનું નામ, સરનામું, ફોન, ઈમેલ, GSTIN, State; પ્રકાર, નંબર, તારીખ, Due, Ref; *Bill To* (પાર્ટી, સરનામું, ફોન, GSTIN); Transport (હોય તો); લાઇન ટેબલ અને કોલમ-સરવાળો; **Tax Summary** (દર મુજબ Taxable + CGST/SGST કે IGST); રકમ શબ્દોમાં; Description; Sub Total, Discount (બિલ પરનું), Total Tax, Additional Charges, Round Off, **Total**, Received/Paid (Settle સાથે), **Balance**; *Authorised Signatory*.
Payment દસ્તાવેજમાં ટેબલને બદલે *Payment-In of ₹X via Cash*.
**લોગો અને સહી હજી બિલમાં નથી આવતાં** ([KI-09](#21)).

---

<a id="11"></a>
## ૧૧. સેલ — દરેક પ્રકાર

| સાઇડબાર | યાદીની ખાસિયત | ફોર્મ | હિસાબ પર અસર |
| --- | --- | --- | --- |
| Sale Invoices | સરવાળો + Balance | Customer, Received | [વિભાગ ૧](#1) |
| Estimate/ Quotation | સરવાળો નથી; ⋮ → Convert to Sale Invoice | ચુકવણી ભાગ નથી | કંઈ નહીં |
| Proforma Invoice | એ જ | એ જ | કંઈ નહીં |
| Payment-In | Receipt no; Balance/Due કોલમ નથી | Amount + Settle | પાર્ટી −, રોકડ/બેંક + |
| Sale Order | સ્ટેટસ ફિલ્ટર; Convert | ચુકવણી નથી | કંઈ નહીં; ડેશબોર્ડ Open Orders +1 |
| Delivery Challan | Convert | ચુકવણી નથી | કંઈ નહીં (**સ્ટોક પણ નહીં**) |
| Sale Return/ Credit Note | સ્ટેટસ ફિલ્ટર | ફોર્મમાં *Received* લખ્યું હોય, પણ એ **પાછી આપેલી** રકમ છે | પાર્ટી −, સ્ટોક +, રોકડ − |
| Dhandho POS | માહિતી પેજ | — | — |

---

<a id="12"></a>
## ૧૨. પરચેઝ અને એક્સપેન્સ

| સાઇડબાર | શું |
| --- | --- |
| Purchase Bills | Supplier, *Paid*. સ્ટોક +, પાર્ટી − બાકી, રોકડ/બેંક − Paid |
| Payment-Out | સપ્લાયરને ચુકવણી; Settle against open bills. પાર્ટી +, રોકડ/બેંક − |
| Purchase Order | Open; ⋮ → Convert to Purchase Bill |
| Purchase Return/ Dr. Note | સ્ટોક −, પાર્ટી + બાકી, રોકડ/બેંક + |

### Expenses (`/purchase/expenses`)

ઉપર ટેબ **Category** અને **Items**, નીચે *Filter by*.

**Category ટેબ:**

| ભાગ | શું થાય |
| --- | --- |
| *Search category* | — |
| *Add Expense* | નવું Expense ફોર્મ |
| યાદી: કેટેગરી + Amount | Amount **બધા સમયનો** સરવાળો ([KI-17](#21)) |
| લાઇનનું ⋮ | *Add Expense*, *Delete Category* (એના ખર્ચ *Uncategorised* થાય) |
| *New Expense Category* | નામ + Type: *Indirect* (ડિફોલ્ટ) / *Direct* |
| જમણે | નામ, પ્રકાર, TOTAL, BALANCE, અને **પસંદ કરેલા સમયગાળા** ના એ કેટેગરીના ખર્ચ |

પહેલેથી આવતી કેટેગરી: Rent, Salary, Tea (Indirect), Transport, Petrol (Direct).

**Items ટેબ:** સમયગાળાના બધા ખર્ચ + Total.

**Expense ફોર્મ:** પાર્ટીનું ખાનું (*Customer* લખેલું) **ફરજિયાત** છે — જેમ કે "Staff" ટાઇપ કરો ([KI-24](#21)). Expense Category ફરજિયાત. લાઇનમાં ખર્ચનું વર્ણન, qty, રકમ. *Paid*. સ્કેન પટ્ટી નથી.
**અસર:** રોકડ/બેંક − Paid. યાદીની પાર્ટી પસંદ કરી હોય અને બાકી રાખ્યું હોય તો પાર્ટી −. P&L માં Expense.

---

<a id="13"></a>
## ૧૩. કેશ અને બેંક

### Bank Accounts (`/cash-bank/bank-accounts`)

| ભાગ | શું થાય |
| --- | --- |
| ખાતું ન હોય | પરિચય પેજ + *Add Bank Account* |
| *Add Bank* / ફોર્મ | Account Display Name (ફરજિયાત), Opening Balance, As of Date, Bank Name, Account Holder Name, Account Number, IFSC, UPI ID, *Print bank details on invoices*, *Print UPI QR code on invoices* (બંને ચેકબોક્સ હાલ ફક્ત સચવાય) |
| ડાબે યાદી | ખાતું + બેલેન્સ |
| જમણે | વિગત, મોટું બેલેન્સ (માઇનસ હોય તો લાલ), ⋮ → *Edit Account*, *Delete Account* |
| *Transactions* | બેંક સ્ટેટમેન્ટ: Date, Description, Withdrawal, Deposit, **Balance** (ઓપનિંગથી ચાલતું). **આખો ઇતિહાસ** (તારીખ ફિલ્ટર નથી). ક્લિક → દસ્તાવેજ. |

**અસર:** ઓપનિંગ બદલો → બેલેન્સ તરત બદલાય (ડેશબોર્ડ સાથે).
**ડિલીટ** → *Transactions linked to it will lose the account reference.* એ દસ્તાવેજની રકમ પછી રોકડ કે બેંક ક્યાંય ન ગણાય ([KI-04](#21)).

### Cash In Hand (`/cash-bank/cash-in-hand`)

| ભાગ | શું થાય |
| --- | --- |
| ઉપર બેલેન્સ | લીલું/લાલ |
| *Adjust Cash* | સ્વિચ *Add Cash* / *Reduce Cash*, Amount (> 0), Adjustment Date, Description → Save |
| યાદી | Type, Name, Date, Amount (લીલું = આવી, લાલ = ગઈ). દસ્તાવેજની લાઇન પર ક્લિક → બિલ. એડજસ્ટમેન્ટ: *Cash Added* / *Cash Reduced*. |

એડજસ્ટમેન્ટ ડિલીટ કરવાનું બટન નથી.

### Cheques (`/cash-bank/cheques`)

- ટેબ *Open Cheques* / *All Cheques*; સમયગાળો (ડિફોલ્ટ This Financial Year).
- Payment Type `Cheque` વાળા દસ્તાવેજ. *Type*: Receivable (પૈસા આવે) / Payable.
- *Open* = સ્ટેટસ Paid નથી એવા.
- ચેક નંબર લખવાનું ખાનું નથી, એટલે *Cheque No.* હંમેશાં "—" ([KI-11](#21)).

### Loan Accounts (`/cash-bank/loans`)

| ભાગ | શું થાય |
| --- | --- |
| *Add Loan Account* | Lender Name (ફરજિયાત), Account Number, Loan Type, Loan Amount, Interest Rate (% p.a.), Term (months), Start Date, Description. રકમ + વ્યાજ + મહિના ભરતાં **Estimated EMI** દેખાય. |
| લોન કાર્ડ | બાકી રકમ, વ્યાજદર, પ્રગતિ પટ્ટી (ભરેલી મુદ્દલ %), Principal paid, Interest, શરૂઆત/મહિના |
| *Record EMI* / ⋮ → *Record EMI / Payment* | Type, Date, Total Amount, Interest Portion (બાકી = મુદ્દલ), Payment Type, Bank Account, Description |
| ⋮ → *Delete Loan* | EMI ઇતિહાસ સાથે ડિલીટ |

**EMI સૂત્ર:** `P × r × (1+r)^n ÷ ((1+r)^n − 1)`, r = વાર્ષિક% ÷ 12 ÷ 100. વ્યાજ 0 હોય તો P ÷ n.
**અસર:** ફક્ત લોનનું બાકી ઘટે. **રોકડ/બેંક પર અસર નથી** ([KI-10](#21)).

---

<a id="14"></a>
## ૧૪. એકાઉન્ટિંગ

| સ્ક્રીન | શું |
| --- | --- |
| **Journal Entry** | સામાન્ય યાદી; ફોર્મમાં આઇટમ લાઇન. **કોઈ હિસાબી અસર નહીં**, સ્ટેટસ Open. |
| **Party to Party** | *Add Transfer* → Party to Party (Received) ફોર્મ. ફોર્મમાં આઇટમ લાઇન દેખાય, પણ **રકમ *Received* ખાનામાંથી લેવાય** અને ફક્ત **એક** પાર્ટીનું બેલેન્સ બદલાય ([KI-12](#21)). Received: પાર્ટી −; Paid: પાર્ટી +. રોકડ પર અસર નહીં. |

---

<a id="15"></a>
## ૧૫. રિપોર્ટ્સ — `/reports`

મુખ્ય પેજ પર છ જૂથના કાર્ડ. રિપોર્ટ ખોલો એટલે ડાબે એ જ યાદી.

**દરેક રિપોર્ટમાં:**

- શીર્ષક.
- *Excel Report* → CSV (ખાલી હોય તો *Nothing to export for this period*).
- *Print*.
- *Filter by* — દરેક રિપોર્ટનો અલગ યાદ રહે. ડિફોલ્ટ This Month; P&L માં This Financial Year. All parties, Low Stock, Stock summary માં ફિલ્ટર નથી.
- ટેબલમાં ક્રમ/ફિલ્ટર; ઘણી લાઇન પર ક્લિક → દસ્તાવેજ.

| રિપોર્ટ | શું બતાવે | આંકડા ક્યાંથી |
| --- | --- | --- |
| **Sale** / **Purchase** | એ પ્રકારના દસ્તાવેજ | સમયગાળા મુજબ; Total, Balance |
| **Day book** | સમયગાળાના બધા દસ્તાવેજ; Money In / Money Out | Received રકમ × દિશા (રોકડ + બેંક બંને; Cash Adjustment **નહીં**) |
| **All Transactions** | બધા પ્રકાર | — |
| **Profit And Loss** | ડાબે: Sale − Credit Note = Net Sale; Opening Stock; Purchase − Debit Note = Net Purchase; Closing Stock; **Gross Profit**. જમણે: કેટેગરી મુજબ ખર્ચ, Total Expenses, Tax Payable (Output − Input), **Net Profit** | Gross = Net Sale + Closing − Opening − Net Purchase; Net = Gross − Expense. Sale/Purchase **ટેક્સ સાથે**. Opening = આઇટમનો ઓપનિંગ × At Price; Closing = **આજનો** સ્ટોક × Purchase Price ([KI-14](#21)) |
| **Bill Wise Profit** | દરેક Sale Invoice: Revenue (ટેક્સ વગર), Cost (qty × **હાલની** Purchase Price), Profit | — |
| **Sale Aging** | બાકીવાળાં Sale Invoice; ખાનાં: ડ્યુ નથી, 1–30, 31–45, 46–60, 60+ દિવસ | Due Date (ન હોય તો Date) થી આજ સુધી; **સમયગાળાની અસર નથી** |
| **Cash flow** | Received રકમની આવ-જાવ, ચાલતું બેલેન્સ | Day book જેવું |
| **Balance Sheet** | Assets: Receivable + Closing Stock; Liabilities: Payable; Net Worth | રોકડ/બેંક નથી; સમયગાળાની અસર નથી ([KI-15](#21)) |
| **Party Statement** | ઉપર પાર્ટી ડ્રોપડાઉન (ડિફોલ્ટ પહેલી પાર્ટી); Opening, દરેક દસ્તાવેજ Debit/Credit, ચાલતું બેલેન્સ, Closing | Opening = પાર્ટીનું ઓપનિંગ (સમયગાળા પહેલાંના દસ્તાવેજ **નથી** ઉમેરાતા). Closing ટોચના બેલેન્સ જેટલું ત્યારે જ આવે જ્યારે સમયગાળામાં બધા દસ્તાવેજ હોય. |
| **All parties** | Phone, GSTIN, Group, Receivable, Payable | ચાલુ બેલેન્સ |
| **Sale Purchase By Party** | પાર્ટી મુજબ Sale ટોટલ, Purchase ટોટલ | સમયગાળો |
| **Discount Report** | ડિસ્કાઉન્ટવાળા દસ્તાવેજ (Expense સિવાય) | ડિસ્કાઉન્ટ = લાઇન + બિલ |
| **GSTR 1** | Sale + Credit Note: GSTIN, પાર્ટી, નંબર, તારીખ, પ્રકાર, દર મુજબ Taxable/Tax, Value | — |
| **GSTR 2** | Purchase + Debit Note | — |
| **GST Rate Report** | દર × (Sale/Purchase): Taxable, Tax | — |
| **Sale Summary By HSN** | HSN મુજબ Qty, Taxable, Tax, Total (ફક્ત Sale) | — |
| **Stock summary** | પ્રોડક્ટ: કોડ, કેટેગરી, Stock Qty, ભાવ, Stock Value; કુલ | ચાલુ સ્ટોક |
| **Item Wise Profit And Loss** | આઇટમ: Qty Sold, Revenue, Cost, Profit | ⚠️ ખોટા આંકડા ([KI-02](#21)) |
| **Low Stock Summary** | In Stock, Min Level, Short By | Min > 0 અને સ્ટોક ≤ Min |
| **Item Detail** | દરેક દસ્તાવેજની દરેક આઇટમ લાઇન | સમયગાળો, બધા પ્રકાર |
| **Expense** | ખર્ચ + કેટેગરી; Total | — |
| **Expense Category Report** | કેટેગરી, Type, Total | સમયગાળો |
| **Sale/ Purchase Orders** | બંને ઓર્ડર, સ્ટેટસ | — |

---

<a id="16"></a>
## ૧૬. યુટિલિટીઝ

### Import Items / Import Parties

| ભાગ | શું થાય |
| --- | --- |
| *Drop a CSV here* / ક્લિક | CSV પસંદ; ખાલી ફાઇલ → *That file has no data rows* |
| ઝલક | પહેલી 8 લાઇન; *Showing the first 8 of N rows* |
| *Import N items/parties* | ઇમ્પોર્ટ; *Imported N record(s)*, *N rows skipped* + દરેક કારણ (Row નંબર = Excel ની લાઇન) |
| જમણે *Expected columns* + *Download template* | નમૂનાની CSV |

**કોલમના નામ ઢીલાં મેળવાય** (નાના-મોટા અક્ષર, space, `_ . / -` અવગણાય):

- **આઇટમ:** item name/name/product/item (ફરજિયાત), type, item code/code/sku/barcode, hsn, unit/uom, category (ન હોય તો નવી બને), sale price, purchase price, tax rate/gst, opening stock/qty, opening stock price, min stock, location.
- **પાર્ટી:** party name/name/customer/supplier (ફરજિયાત), phone/mobile, email, gstin, party type, address, state, group, opening balance, balance type.

**નિયમ:**

- આઇટમ કોડ ખાલી → `ITM<id>`.
- સરખો કોડ → એ લાઇન skip: *Item code "X" is already used by Y*.
- સરખા નામની પાર્ટી → skip: *"X" already exists — skipped*.
- Opening balance ઓછા કે type માં "pay" → To Pay.
- 5000 થી વધુ લાઇન ન ચાલે.
- બધી લાઇન નિષ્ફળ → *Nothing could be imported — check the column headings.*

### Verify My Data

*Verify & Rebuild* → દરેક પાર્ટીનું બેલેન્સ (ઓપનિંગ + દસ્તાવેજો) અને દરેક આઇટમનો સ્ટોક (ઓપનિંગ + દસ્તાવેજો + એડજસ્ટમેન્ટ) શરૂઆતથી ફરી ગણે.
સંદેશ: *Balances and stock recalculated from the ledger.* દસ્તાવેજ બદલાતા નથી.

### Export (Utilities → Export Items)

ત્રણ કાર્ડ: **Items**, **Parties**, **Transactions** (ફક્ત ચાલુ નાણાકીય વર્ષ, 5000 સુધી) → CSV.

### Set Up My Business

- **પગલું 1:** Company Name, Phone Number, Business Category (ત્રણેય ફરજિયાત) → *Next*.
- **પગલું 2:** Business Type, GSTIN, State, Address → *Finish Setup* → હોમ.
- જમણે નમૂનાનું બિલ, ટાઇપ કરતાં બદલાય.
- ⚠️ Finish Setup ઈમેલ, પિનકોડ, લોગો, સહી, Books Beginning Date **ભૂંસી નાખે** ([KI-03](#21)).

### Close Financial Year

- વર્ષ પસંદ કરો (ચાલુ + પાછલાં 3).
- Net Sale, Net Purchase, Total Expenses, Closing Stock, Gross Profit, Net Profit, Tax Payable દેખાય.
- *Open full P&L* → P&L રિપોર્ટ (પણ પસંદ કરેલું વર્ષ નહીં — [KI-13](#21)).
- *Export the year's data* → Export પેજ.
- કંઈ ડિલીટ થતું નથી.

### Item QR Labels

[વિભાગ ૮](#8).

---

<a id="17"></a>
## ૧૭. સેટિંગ્સ અને બિઝનેસ પ્રોફાઇલ

### Settings (`/settings`)

| ભાગ | શું થાય |
| --- | --- |
| Business Profile કાર્ડ | પ્રોફાઇલ પેજ |
| દરેક સ્વિચ | સેવ થાય: *<નામ> enabled/disabled* |
| **QR / barcode scanning** (Item) | ✅ **કામ કરે છે** — બંધ કરો તો બિલ ફોર્મની સ્કેન પટ્ટી છુપાય. ડિફોલ્ટ ચાલુ. |
| બાકીની બધી સ્વિચ — GST, Stock, Round off, Passcode, Due date, Transportation, E-way bill, Free qty, Item-wise discount/tax, Party grouping, Credit limit, Shipping address | ⚠️ ફક્ત સચવાય, **એપમાં કોઈ અસર નથી** ([KI-07](#21)) |
| Formats: Currency, Date Format | ⚠️ સચવાય, અસર નથી |

### Business Profile (`/settings/profile`)

| ખાનું | નિયમ |
| --- | --- |
| Business Name | ફરજિયાત |
| Phone, Email, GSTIN (ફોર્મેટ ચકાસાય), Business Type, Business Category, **State** (GST નો પ્રકાર), Pincode, Account Books Beginning Date, Business Address | — |
| Logo, Signature અપલોડ | 400KB થી નાની છબી; *Remove logo/signature* |
| *Save* | *Business profile saved* |

**અસર:** નામ ટોપબાર, સાઇડબાર, છાપેલા બિલમાં. State → બિલમાં CGST/SGST કે IGST.

---

<a id="18"></a>
## ૧૮. હજી ન બનેલી (ફક્ત માહિતીવાળી) સ્ક્રીન

આ પેજ પર ફક્ત સુવિધાનું વર્ણન અને બીજે જવાનું બટન છે — કોઈ ડેટા નથી બદલાતો:
WhatsApp Connect, Dhandho Network, Dhandho POS, Grow Your Business, Auto Backup / Backup to Computer, Restore Backup, Accountant Access, Update Items In Bulk, Import From Tally, Exports To Tally, Track Your Salesmen.

---

<a id="19"></a>
## ૧૯. કઈ ક્રિયાથી ક્યાં અસર — મોટું કોષ્ટક

✅ = બદલાય, — = ન બદલાય.

| ક્રિયા | પાર્ટી બેલેન્સ / Receivable-Payable | આઇટમ સ્ટોક / Stock Value | Cash In Hand | બેંક | ડેશબોર્ડ Total Sale | રિપોર્ટ |
| --- | --- | --- | --- | --- | --- | --- |
| નવી પાર્ટી (ઓપનિંગ સાથે) | ✅ | — | — | — | — | All parties, Balance Sheet, Party Statement (Opening) |
| નવી આઇટમ (ઓપનિંગ સ્ટોક) | — | ✅ | — | — | — | Stock summary, Low stock, P&L Opening/Closing |
| Stock Adjustment | — | ✅ | — | — | — | Stock summary, Low stock, P&L Closing |
| Sale Invoice | ✅ + બાકી | ✅ − | ✅ + (Cash) | ✅ + (બેંક) | ✅ | Sale, Day book, P&L, Bill Wise, Aging, Cash flow, Party Statement, GSTR 1, GST Rate, HSN, Item Detail, Discount |
| Purchase Bill | ✅ − બાકી | ✅ + | ✅ − | ✅ − | — | Purchase, Day book, P&L, Cash flow, Statement, GSTR 2, GST Rate, Item Detail |
| Payment-In (+ Settle) | ✅ − | — | ✅ + | ✅ + | — | Day book, Cash flow, Statement; બિલનું Balance/સ્ટેટસ, Aging |
| Payment-Out | ✅ + | — | ✅ − | ✅ − | — | Day book, Cash flow, Statement |
| Credit Note | ✅ − બાકી | ✅ + | ✅ − | ✅ − | — | P&L (Sale Return), GSTR 1, Statement |
| Debit Note | ✅ + બાકી | ✅ − | ✅ + | ✅ + | — | P&L (Purchase Return), GSTR 2, Statement |
| Expense | ✅ − (યાદીની પાર્ટી + બાકી હોય તો) | — | ✅ − | ✅ − | — | Expense, Expense Category, P&L, Day book |
| Estimate / Proforma / Challan | — | — | — | — | — | Item Detail |
| Sale / Purchase Order | — | — | — | — | — | Orders, Item Detail; ડેશબોર્ડ Open Orders |
| Party to Party | ✅ | — | — | — | — | Statement |
| Journal Entry | — | — | — | — | — | Item Detail |
| Adjust Cash | — | — | ✅ | — | — | — (Day book/Cash flow માં નથી) |
| નવું બેંક ખાતું / ઓપનિંગ બદલો | — | — | — | ✅ | — | — |
| Record EMI | — | — | — | — | — | ફક્ત લોન કાર્ડ |
| કોઈ પણ દસ્તાવેજ એડિટ | જૂની અસર પાછી + નવી | એ જ | એ જ | એ જ | એ જ | એ જ |
| કોઈ પણ દસ્તાવેજ ડિલીટ | અસર પાછી | એ જ | એ જ | એ જ | એ જ | દસ્તાવેજ ગાયબ |
| Verify My Data | ફરી ગણાય (આંકડો બદલાવો ન જોઈએ) | ફરી ગણાય | — | — | — | — |

---

<a id="20"></a>
## ૨૦. ટેસ્ટ કેસ

**કેવી રીતે ચલાવવા:**

- ખાલી ડેટાબેઝ લો: `npm run db:reset -- --yes` (બિઝનેસ પ્રોફાઇલ અને યુનિટ રહે).
- એક જ દિવસે, એક જ મહિનામાં ચલાવો. "આજ" = ચલાવવાનો દિવસ.
- દરેક ટેસ્ટમાં "અપેક્ષિત" સાચું ન આવે તો ફેલ.
- ⚠️ ચિહ્નવાળા ટેસ્ટ હાલની ખામીને કારણે **ફેલ થવાની અપેક્ષા** છે — એ ખામી સુધરે ત્યારે પાસ થવા જોઈએ.

**ઓટોમેટિક ટેસ્ટ:** `npm run dev` ચાલુ રાખીને `npm run test:ledger` — પોસ્ટિંગ, એડિટ, ડિલીટ, Settle, ટેક્સ, ડિસ્કાઉન્ટ, Verify, સ્ટોક એડજસ્ટમેન્ટ, બેંક તપાસે છે.

### ૨૦.૧ મુખ્ય સળંગ દૃશ્ય (E2E) — એક પછી એક, આંકડા સાથે

**તૈયારી:**

| # | પગલું |
| --- | --- |
| S1 | Business Profile: નામ "Test Traders", State **Gujarat** → Save |
| S2 | Bank Account: "HDFC", Opening Balance **50,000** |
| S3 | Adjust Cash → Add Cash **10,000** |
| S4 | પાર્ટી A: "Ramesh Traders", Customer, State Gujarat, Opening **1,000 To Receive** |
| S5 | પાર્ટી B: "Shah Suppliers", Supplier, State **Maharashtra**, Opening **2,000 To Pay** |
| S6 | આઇટમ X: "Pen Box", Product, Item Code **ખાલી**, Sale 250, Purchase 200, GST 18%, Opening Qty **12** at 200, Min Stock **5** |

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| E2E-01 | તૈયારી પછી ડેશબોર્ડ | Receivable ₹1,000; Payable ₹2,000; Cash ₹10,000; Bank ₹50,000; Stock Value ₹2,400; ઓછા સ્ટોકનો સંદેશ નહીં |
| E2E-02 | આઇટમ X જુઓ | કોડ `ITM` + 5 અંક; Stock 12 (લીલો); QR દેખાય |
| E2E-03 | Add Sale: A, X qty 2 @250, 18%, Received **100**, Cash, Terms 0, Round Off ટિક → Save | Subtotal 500, Tax 90 (CGST 45 + SGST 45), Total **590**, Balance **490**, સ્ટેટસ **Partial** |
| E2E-04 | E2E-03 પછી | A = **1,490** (You Receive); X stock **10**; Cash **10,100**; ડેશબોર્ડ Total Sale 590, 1 invoices; Stock Value 2,000 |
| E2E-05 | Payment-In: A, Amount **300**, Cash, Invoice #1 સામે Settle **300** → Save | A = **1,190**; Cash **10,400**; Invoice #1: Balance **190**, Received **400**, Partial |
| E2E-06 | Credit Note: A, X qty 1 @250, 18%, Received 0 | Total **295**; A = **895**; X stock **11**; Cash **10,400** (બદલાયું નહીં) |
| E2E-07 | Purchase Bill: B, X qty 5 @200, 18%, *Mark as fully paid*, Payment Type **Bank Account → HDFC** | Total **1,180**, Balance 0, Paid; B = **2,000 You Pay** (બદલાયું નહીં); X stock **16**; Bank **48,820**; Cash **10,400** |
| E2E-08 | E2E-07 નું બિલ જુઓ | Tax Summary માં **IGST 180** (CGST/SGST નહીં), Taxable 1,000 |
| E2E-09 | Sale: A, X qty 1, Price **295**, *incl. tax* ટિક, 18%, Received 0 | Subtotal **250**, Tax **45**, Total **295**; A = **1,190**; X stock **15** |
| E2E-10 | Sale: A, X qty 4, Price **100**, Discount **10 %**, GST **5%**, Round Off **બંધ**, Received 0 | Subtotal **360**, Tax **18**, Total **378**; A = **1,568**; X stock **11** |
| E2E-11 | E2E-10 ખોલો → Edit → *Mark as fully paid* → Save | સ્ટેટસ **Paid**; A = **1,190**; Cash **10,778**; X stock **11** (બદલાયો નહીં) |
| E2E-12 | E2E-10 નું બિલ Delete | A = **1,190**; X stock **15**; Cash **10,400**; યાદીમાંથી ગાયબ |
| E2E-13 | Expense: Category Rent, પાર્ટીમાં "Landlord" ટાઇપ, લાઇન "Shop rent" qty 1 @5,000, GST 0, Round Off બંધ, fully paid, Cash | Total 5,000; Cash **5,400**; કોઈ પાર્ટી બેલેન્સ બદલાયું નહીં |
| E2E-14 | Payment-Out: B, Amount **2,000**, Payment Type **UPI**, Bank **HDFC** | B = **0**; Bank **46,820**; Cash 5,400 |
| E2E-15 | આઇટમ X → Adjust Stock → Reduce **1** | X stock **14**; Stock Value **₹2,800** |
| E2E-16 | ડેશબોર્ડ (This Month) | Receivable **₹1,190**; Payable **₹0**; Total Sale **₹885** (2 invoices); Cash **₹5,400**; Bank **₹46,820**; Stock Value **₹2,800** |
| E2E-17 | Sale Invoices યાદી (This Month) | 2 લાઇન; Total 885; Received 400; Balance **485** |
| E2E-18 | Party Statement: A (This Month) | Opening 1,000; Sale +490; Payment-In −300; Credit Note −295; Sale +295; Closing **1,190** |
| E2E-19 | Day book (This Month) | Money In **400** (100 + 300); Money Out **8,180** (1,180 + 5,000 + 2,000) |
| E2E-20 | Profit And Loss (This Financial Year) | Sale 885; Sale Return 295; Net Sale **590**; Opening Stock **2,400**; Purchase 1,180; Net Purchase **1,180**; Closing Stock **2,800**; Gross Profit **−190**; Expenses 5,000; Net Profit **−5,190**; Tax Payable **−45** (135 − 180) |
| E2E-21 | Sale Aging | Current (ડ્યુ નથી) **485**; બાકી ખાનાં 0 |
| E2E-22 | GSTR 1 (This Month) | 3 લાઇન: 2 Sale + 1 Credit Note |
| E2E-23 | Stock summary | X: Stock 14, Value 2,800; કુલ 2,800 |
| E2E-24 | Verify My Data → Verify & Rebuild | સફળ સંદેશ; A 1,190, B 0, X 14 — **કંઈ બદલાયું નહીં** |
| E2E-25 | HDFC બેંક સ્ટેટમેન્ટ | Purchase Bill Withdrawal 1,180 → 48,820; Payment-Out Withdrawal 2,000 → **46,820** |
| E2E-26 | Cash In Hand યાદી | Cash Added 10,000; Sale 100; Payment-In 300; Expense −5,000; બેલેન્સ **5,400** |

### ૨૦.૨ લોગિન

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| AUTH-01 | નવા ઈમેલથી રજિસ્ટર, પાસવર્ડ 8 અક્ષર | અંદર, હોમ ખૂલે |
| AUTH-02 | પાસવર્ડ 7 અક્ષર | બ્રાઉઝર રોકે / *Password must be at least 8 characters.* |
| AUTH-03 | એ જ ઈમેલ ફરી રજિસ્ટર | *An account with that email already exists — sign in instead.* |
| AUTH-04 | ખોટો પાસવર્ડ | *Email or password is incorrect.* |
| AUTH-05 | ન હોય એવો ઈમેલ | એ જ સંદેશ (ઈમેલ છે કે નહીં ન જણાય) |
| AUTH-06 | લોગઆઉટ સ્થિતિમાં `/items` ખોલો | લોગિન પેજ; લોગિન પછી `/items` |
| AUTH-07 | Sign out → બ્રાઉઝર Back | લોગિન પેજ; જૂનો ડેટા ન દેખાય |
| AUTH-08 | ગૂગલ પેજ પર રદ કરો | લોગિન પર *Google sign-in was cancelled.* |
| AUTH-09 | `/login?next=//evil.com` થી લોગિન | હોમ પર જ જાય, બહારની સાઇટ નહીં |

### ૨૦.૩ નેવિગેશન અને સર્ચ

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| NAV-01 | ગમે તે પેજ પર Ctrl+F | Open Anything |
| NAV-02 | સાઇડબાર સંકોચો → રીલોડ | સંકોચાયેલો જ રહે |
| NAV-03 | Sale → Sale Invoices પર માઉસ → + | નવું Sale Invoice |
| NAV-04 | ટોપબાર + → Add Party | પાર્ટી ફોર્મ ખુલ્લું; Cancel → `/parties` |
| NAV-05 | બિઝનેસ નામ *My Company* હોય | ટોપબારમાં *Enter Business Name* |
| SRCH-01 | સર્ચમાં આઇટમ કોડ | Items માં એ આઇટમ |
| SRCH-02 | સર્ચમાં બિલ નંબર | Transactions માં; ક્લિક → બિલ |
| SRCH-03 | ગયા નાણાકીય વર્ષનું બિલ શોધો | નહીં મળે (જાણીતું વર્તન) |
| SRCH-04 | કશું ન મળે | *Nothing matches "…"* |

### ૨૦.૪ ડેશબોર્ડ

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| DASH-01 | કોઈ ડેટા નહીં | Receivable/Payable નીચે *You don't have any receivables/payables as of now.* |
| DASH-02 | Range → Last Month (આ મહિનાનાં જ બિલ) | Total Sale 0; બીજાં ખાનાં બદલાય નહીં |
| DASH-03 | આઇટમ Min 5, stock 5 કરો | *1 item low on stock* |
| DASH-04 | Sale Order બનાવો | *Open Orders 1*; *Review orders* → Sale Orders |
| DASH-05 | દરેક ખાના પર ક્લિક | [વિભાગ ૫](#5) મુજબ પેજ |
| DASH-06 | ગયા સમય કરતાં વેચાણ વધ્યું | લીલું ↑ % |

### ૨૦.૫ પાર્ટીઝ

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| PTY-01 | નામ વગર Save | *Party name is required* |
| PTY-02 | GSTIN "ABC" | *That GSTIN does not look valid* |
| PTY-03 | ફોન "12ab" | *Enter a valid phone number* |
| PTY-04 | Opening 500 To Pay | લાલ 500; ડેશબોર્ડ Payable +500 |
| PTY-05 | Edit: Opening 1,000 → 1,500 (વ્યવહાર પછી) | બેલેન્સ +500 જ ખસે |
| PTY-06 | Edit: To Receive → To Pay (1,000) | બેલેન્સ −2,000 ખસે |
| PTY-07 | વ્યવહારવાળી પાર્ટી Delete | *This party has transactions…* |
| PTY-08 | વ્યવહાર વગરની પાર્ટી Delete | ગાયબ; *<નામ> deleted* |
| PTY-09 | ⋮ → Add Sale Invoice | ફોર્મમાં પાર્ટી ભરેલી |
| PTY-10 | 💬 | `wa.me/91<ફોન>` ખૂલે |
| PTY-11 | 📄 | Party Statement, એ જ પાર્ટી |
| PTY-12 | ફોન/GSTIN થી શોધ | મળે |
| PTY-13 | Credit Limit 100, બાકી 1,000 | કોઈ ચેતવણી નહીં ⚠️ [KI-08](#21) |

### ૨૦.૬ આઇટમ્સ અને સ્ટોક

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| ITM-01 | નામ વગર Save | *Item name is required* |
| ITM-02 | Service બનાવો, Opening 10 | Stock ટેબ માં *Services do not carry stock…*; યાદીમાં Quantity "—" |
| ITM-03 | Edit → Type | બદલી ન શકાય |
| ITM-04 | Opening 12 → 15 (વેચાણ પછી stock 10) | stock **13** |
| ITM-05 | Mark Inactive | બિલના ડ્રોપડાઉનમાં ન આવે; Mark Active → ફરી આવે |
| ITM-06 | વપરાયેલી આઇટમ Delete | *This item is used in transactions…* |
| ITM-07 | Stock Adjust Reduce > stock | *Only N in stock — cannot reduce by M* |
| ITM-08 | Stock Adjust qty 0 | *Enter a quantity greater than zero* |
| ITM-09 | Adjust Add 3 | stock +3; ડેશબોર્ડ Stock Value +3×Purchase |
| ITM-10 | stock ≤ Min | યાદીમાં પીળો; Low Stock Summary માં, Short By સાચું |
| ITM-11 | stock માઇનસ (સ્ટોકથી વધુ વેચો) | લાલ; એપ વેચાણ રોકતી નથી |
| ITM-12 | New Category → Add | બને અને પસંદ થાય |
| ITM-13 | વપરાયેલી Category ડિલીટ | આઇટમ Uncategorised |
| ITM-14 | Add Unit, Short Name ખાલી | સેવ ન થાય |
| ITM-15 | Default Discount 10% → બિલમાં આઇટમ પસંદ | Discount 10% ભરાય |
| ITM-16 | Sale price incl. tax ટિક → બિલમાં | *incl. tax* ટિક આવે |

### ૨૦.૭ આઇટમ કોડ અને QR

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| QR-01 | Item Code ખાલી → Save | કોડ `ITM` + id 5 અંક (જેમ કે `ITM00042`) |
| QR-02 | બીજી આઇટમમાં `pen-box` (પહેલી `PEN-BOX`) | *Item code "pen-box" is already used by <નામ>* (409) |
| QR-03 | કોડ `  ABC  ` | `ABC` સચવાય |
| QR-04 | Edit → કોડ ખાલી → Save | `ITM<id>` પાછો આવે |
| QR-05 | બીજી આઇટમનો કોડ હાથે `ITM00050` રાખ્યો હોય અને id 50 ની આઇટમ કોડ વગર બને | `ITM00050-2` |
| QR-06 | નાના QR પર ક્લિક | મોડલ: મોટો QR, નામ, કોડ, લિંક `<origin>/i/<code>` |
| QR-07 | Download | `<code>-qr.png`; ફોનથી સ્કેન કરતાં લિંક ખૂલે |
| QR-08 | QR મોડલ → Print Labels… | Item QR Labels ખૂલે; એ આઇટમ ટિક, Copies 1 |
| QR-09 | મોબાઇલ પેજ → QR બટન → Print Labels… | એ જ |
| QR-10 | Item QR Labels: stock 14 ની આઇટમ ટિક | Copies 14 |
| QR-11 | Service / stock 0 ની આઇટમ ટિક | Copies 1 |
| QR-12 | 2 આઇટમ (3 + 2) ટિક | બટન *Print 5 labels*; Preview ઉપર *5 labels · 5 rows* (50×25) |
| QR-13 | કશું ટિક નહીં | Print અને File બટન બંધ; *Sample preview*; Print alignment test ચાલુ |
| QR-14 | Copies 2001 | લાલ *Print at most 2000 labels at a time.*; Print બંધ |
| QR-15 | Inactive આઇટમ | Labels યાદીમાં ન દેખાય |
| QR-16 | Select all → ફરી ક્લિક | બધી ટિક / બધી અનટિક |

### ૨૦.૭-ક લેબલ પ્રિન્ટ (stock, ગોઠવણ, પ્રિન્ટર)

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| LBL-01 | પહેલી વાર પેજ ખોલો | Label stock *50 × 25 mm — 1 across*, Printer 203 dpi, QR holds Link, Name/Code/Price ટિક |
| LBL-02 | 50 × 25, 203 dpi, Link QR | Preview: QR ડાબે ~20.6 mm, લખાણ જમણે; કોઈ ચેતવણી નહીં |
| LBL-03 | 38 × 25 — 2 across, 3 લેબલ | Preview: 2 હાર, પહેલીમાં 2 લેબલ, બીજીમાં 1 |
| LBL-04 | 25 × 25 — 3 across, Link | QR ઉપર ~12.4 mm, લખાણ નીચે; ભૂરી સૂચના *“Code only” QR would make each square 0.5 mm instead of 0.38 mm* |
| LBL-05 | LBL-04 માં QR holds → Item code only | ભૂરી સૂચના ગાયબ; QR નાનો/ખાનાં મોટાં |
| LBL-06 | Custom: 20 × 12 mm, 203 dpi, Link | લાલ *The QR is too dense…*; Print અને File બંધ |
| LBL-07 | LBL-06 માં Printer → Laser/inkjet | લાલ નહીં; પીળી (0.3 mm / 10 mm) ચેતવણી |
| LBL-08 | 50 × 25 પર Business name ટિક + લાંબું નામ | ભૂરી *The business name does not fit…* કે નામ ઓછી લાઇનમાં |
| LBL-09 | Edit sizes → Label width 5 ટાઇપ (min 10) → ખાનું છોડો | 5 સ્વીકારાય નહીં; છેલ્લો સાચો આંકડો પાછો; stock *Custom size…* નહીં બને જ્યાં સુધી સાચો આંકડો ન લખો |
| LBL-10 | Edit sizes → Label height 30 | Label stock *Custom size…*; Preview તરત નવા માપે |
| LBL-11 | Custom → પાછું preset પસંદ | માપનાં ખાનાં preset ના આંકડા બતાવે |
| LBL-12 | A4 65 sheet, 7 લેબલ | Preview: એક શીટ, ઉપર-ડાબેથી 5 + 2; *7 labels · 1 sheet* |
| LBL-13 | A4 sheet, Skip used labels 3 | Preview માં પહેલાં 3 ખાનાં ખાલી |
| LBL-14 | A4, Left margin 40 (Custom) | લાલ *Labels run off the page…* |
| LBL-15 | A4, Left margin 2 | ભૂરી *Most office printers cannot print within 3–4 mm…* |
| LBL-16 | Custom roll: 3 across × 40 mm | પીળી *…print at most 104–108 mm* (203 dpi) |
| LBL-17 | Print (50 × 25) | ડાયલોગમાં પેજ માપ 50 × 25 mm; દરેક લેબલ અલગ પેજ; સાઇડબાર/બટન નહીં; કોઈ પોપ-અપ વિન્ડો નહીં |
| LBL-18 | Print (A4 24) | દરેક પેજ A4, લેબલ સાચી જગ્યાએ; Scale 100% પર માપપટ્ટીથી લેબલ 64 × 33.9 mm |
| LBL-19 | Print alignment test (A4 24) | 24 ડેશવાળાં ખાનાં, ક્રમ 1–24, વચ્ચે +, નીચે માપ |
| LBL-20 | Move right 2, Move down −1 → Print alignment test | બધું 2 mm જમણે, 1 mm ઉપર |
| LBL-21 | Print label outlines ટિક → Print | લેબલ ફરતે ડેશવાળી કિનારી |
| LBL-22 | ગુજરાતી નામવાળી આઇટમ → Print | નામ ગુજરાતીમાં બરાબર |
| LBL-23 | TSPL → File (50 × 25) | `item-labels-50x25.prn`; શરૂઆત `SIZE 50 mm,25 mm` / `GAP 2 mm,0 mm`; દરેક લેબલ `CLS … QRCODE … TEXT … PRINT 1,1` |
| LBL-24 | ZPL → File | `.zpl`; દરેક લેબલ `^XA … ^BQN,2,<n> … ^XZ` |
| LBL-25 | ગુજરાતી નામ → TSPL/ZPL | નામની લાઇન નહીં; કોડ અને `Rs. …` રહે |
| LBL-26 | A4 sheet → File | બંધ; *Printer files are for label rolls…* |
| LBL-27 | Receipt 58 mm → File | બંધ; *Receipt printers use ESC/POS…* |
| LBL-28 | Laser/inkjet → File | બંધ; *Choose the label printer’s resolution…* |
| LBL-29 | TSPL ફાઇલ TSC/TVS પ્રિન્ટરને મોકલો | લેબલ gap પર અટકે; QR ફોનથી સ્કેન થાય |
| LBL-30 | ZPL ફાઇલ Zebra ને મોકલો | એ જ |
| LBL-31 | stock/offset બદલી Print → બીજા કમ્પ્યુટરે પેજ ખોલો | એ જ પસંદગી |
| LBL-32 | stock બદલો પણ Print ન કરો → રીલોડ | જૂની (છેલ્લે છાપેલી) પસંદગી |
| LBL-33 | 50 × 25 પર છાપેલો Link QR ફોનથી | આઇટમ પેજ ખૂલે |
| LBL-34 | 25 × 25 પર Code only QR → બિલની સ્કેન પટ્ટીમાં USB સ્કેનર | આઇટમ ઉમેરાય |
| LBL-35 | 2000 લેબલ → Print | ડાયલોગ થોડી સેકન્ડમાં ખૂલે; 2000 પેજ |
| QR-17 | લેબલ ફોનના કેમેરાથી (લોગિન છે) | `/i/<code>`: નામ, stock, ભાવ, Sell/Purchase/Adjust |
| QR-18 | એ જ, લોગિન નથી | લોગિન → પાછા આઇટમ પેજ પર |
| QR-19 | `/i/NOPE` | *No item found* + *Scan again* |
| QR-20 | મોબાઇલ પેજ → Sell | Sale Invoice, લાઇન 1 માં આઇટમ, qty 1, Sale Price |
| QR-21 | મોબાઇલ પેજ → Purchase | Purchase Bill, Purchase Price |
| QR-22 | મોબાઇલ પેજ → Adjust stock Add 2 → Save | In stock તરત +2 |
| QR-23 | Service નું મોબાઇલ પેજ | In stock ખાનું અને Adjust stock નહીં |
| QR-24 | કોડમાં `/`, space, ગુજરાતી (જેમ કે `A4/500 પેક`) | QR બને; સ્કેનથી સાચી આઇટમ ખૂલે |
| QR-25 | Items → Scan આઇકન → લેબલ | એ આઇટમનું મોબાઇલ પેજ |
| SCAN-01 | Sale ફોર્મ: સ્કેન પટ્ટીમાં કોડ + Enter | લાઇન 1 માં આઇટમ, qty 1; *<નામ> × 1* લીલું |
| SCAN-02 | ફરી એ જ | એ જ લાઇન qty 2; નવી લાઇન નહીં; *× 2* |
| SCAN-03 | બીજી આઇટમ (બધી લાઇન ભરેલી) | નવી લાઇન ઉમેરાય |
| SCAN-04 | ખોટો કોડ | લાલ *No active item has the code "X"* |
| SCAN-05 | Inactive આઇટમનો કોડ | એ જ લાલ સંદેશ |
| SCAN-06 | નાના અક્ષરે કોડ | મળે |
| SCAN-07 | આખી લિંક પેસ્ટ + Enter | આઇટમ ઉમેરાય |
| SCAN-08 | Purchase ફોર્મમાં સ્કેન | Purchase Price આવે |
| SCAN-09 | Expense ફોર્મ | સ્કેન પટ્ટી નથી |
| SCAN-10 | Settings → QR / barcode scanning બંધ | સ્કેન પટ્ટી નથી; ફરી ચાલુ → પાછી |
| SCAN-11 | USB સ્કેનરથી ઝડપી 5 સ્કેન | qty 5, કોઈ સ્કેન છૂટે નહીં |
| SCAN-12 | Camera → પરવાનગી ના | *Camera permission was denied…* |
| SCAN-13 | http + LAN IP પરથી Camera | *The camera only works when the app is opened over https.* |
| SCAN-14 | Camera ચાલુ, એ જ લેબલ 1 સેકન્ડ પકડી રાખો | ફક્ત 1 વાર ઉમેરાય |
| SCAN-15 | Camera: 3 અલગ લેબલ | 3 લાઇન; મોડલમાં છેલ્લો સંદેશ; Done → બંધ, કેમેરાની લાઇટ બંધ |
| SCAN-16 | Android Chrome: પ્રોડક્ટનો EAN બારકોડ (કોડ એ જ) | ઉમેરાય |
| SCAN-17 | iPhone Safari: QR લેબલ | ઉમેરાય |
| IMP-QR-01 | CSV: બે લાઇનમાં સરખો `sku` | બીજી skip: *Item code "…" is already used by …* |
| IMP-QR-02 | CSV: `barcode` કોલમ | એ કોડ તરીકે સચવાય |
| IMP-QR-03 | CSV: કોડ ખાલી | `ITM<id>` |
| MIG-01 | જૂનો DB (ખાલી અને સરખા કોડ) → `npm run db:item-codes` | *Generated N codes and renamed M duplicates.*; પછી `db:push` સફળ |

### ૨૦.૮ બિલ ફોર્મ — ગણતરી

(દરેકમાં Received 0; "Round Off" લખ્યું ન હોય તો બંધ.)

| ID | ઇનપુટ | અપેક્ષિત |
| --- | --- | --- |
| CALC-01 | qty 2 @250, 18% | Subtotal 500, Tax 90, Total 590 |
| CALC-02 | qty 1 @118 incl., 18% | Taxable 100, Tax 18, Total 118 |
| CALC-03 | qty 4 @100, 10%, 5% | 360 / 18 / 378 |
| CALC-04 | qty 4 @100, Discount **₹50**, 5%, Round Off ટિક | Taxable 350, Tax 17.50, Round Off +0.50, Total **368** |
| CALC-05 | CALC-04 માં ₹ → % | 12.5 દેખાય; Total એ જ |
| CALC-06 | qty 2 @250, 18%, બિલ Discount ડ્રોપડાઉનમાં **%** પસંદ કરી **10**, Round Off ટિક | Subtotal 500, Discount 50, Tax **81**, Total **531** |
| CALC-07 | qty 1 @99.50, 0%, Round Off ટિક | Round Off +0.50, Total 100 |
| CALC-08 | CALC-01 + Additional Charges 20 | Total 610 (ટેક્સ 90 જ) |
| CALC-09 | Discount ₹1,000 (Gross 500) | Discount 500 સુધી; Total 0 |
| CALC-15 | નવું Sale બિલ ખોલો | લાઇન Discount ડ્રોપડાઉન **%** પર; બિલ Discount ડ્રોપડાઉન **₹** પર |
| CALC-16 | બિલ Discount **10%** સાથે સેવ → Edit | બિલ Discount ડ્રોપડાઉન **%** પર, 10 ભરેલું |
| CALC-10 | Total 590, Received 1,000 → Save | Received 590, Balance 0, **Paid** |
| CALC-11 | qty 0 → Save | *Every line needs a quantity* |
| CALC-12 | લાઇન નહીં → Save | *Add at least one item* |
| CALC-13 | બે દર: (2 @250, 18%) + (1 @100, 5%) | Tax 95 (90 + 5); Tax Summary માં બે લાઇન |
| CALC-14 | ફોર્મમાં દેખાયેલું Total vs સેવ પછી પેજ | બરાબર સરખું |

### ૨૦.૯ બિલ ફોર્મ — ફીલ્ડ અને વર્તન

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| FORM-01 | નવું Sale | નંબર = છેલ્લો + 1; તારીખ આજ |
| FORM-02 | Terms 30 | Due = આજ + 30 |
| FORM-03 | Due Date જાતે → પછી Terms બદલો | Due Date ન બદલાય |
| FORM-04 | તારીખ 10 દિવસ પહેલાં, Terms 0, Received 0 → Save | **Overdue 10d** |
| FORM-05 | FORM-04 પણ Received 50 | Overdue |
| FORM-06 | ગ્રાહક યાદી બહારનું નામ → Save | સેવ થાય; કોઈ પાર્ટી બેલેન્સ ન બદલાય; બિલ પર એ નામ |
| FORM-07 | Add new party (ફોર્મમાંથી) | પાર્ટી બને અને પસંદ |
| FORM-08 | Add new item (લાઇનમાંથી) | આઇટમ બને અને લાઇનમાં |
| FORM-09 | Payment Type UPI | Bank Account ખાનું દેખાય |
| FORM-10 | Save & New | ફોર્મ ખાલી, નંબર +1; પાછલું સેવ |
| FORM-11 | નંબર જાતે 100 | 100 સચવાય; પછીનું નવું 101 |
| FORM-12 | Mark as fully paid → Total બદલાય | Received આપમેળે નવા Total જેટલું |
| FORM-13 | Duplicate | નવું ફોર્મ: પાર્ટી/લાઇન કોપી, તારીખ આજ, Received ખાલી, નંબર નવો |
| FORM-14 | Estimate → Convert to Sale Invoice → Save | Sale બને (સ્ટોક/પાર્ટી બદલાય); Estimate **Open** જ રહે ⚠️ [KI-06](#21) |
| FORM-15 | Purchase Order → Convert to Purchase Bill | Purchase Bill, વિગત ભરેલી |
| FORM-16 | Sale Order બનાવો | સ્ટોક/પાર્ટી/રોકડ **ન** બદલાય; Open |
| FORM-17 | Delivery Challan | સ્ટોક **ન** ઘટે |
| FORM-18 | Due Date વીતે (Unpaid બિલ) → બીજા દિવસે યાદી | ⚠️ Overdue થવું જોઈએ, હાલ Unpaid રહે [KI-05](#21) |
| FORM-19 | નવા Sale માં પહેલેથી વપરાયેલો નંબર (જેમ કે 1) → Save | ભૂલ નહીં; છેલ્લો + 1 નંબર લાગે |
| FORM-20 | Sale #2 એડિટ → નંબર 1 → Save | *That record already exists — try a different number or name.* |

### ૨૦.૧૦ પેમેન્ટ અને Settle

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| PAY-01 | Payment-In, Amount 0 | *Enter an amount greater than zero* |
| PAY-02 | પાર્ટી પસંદ | બાકી બિલ (Unpaid/Partial/Overdue) જ દેખાય; Paid નહીં |
| PAY-03 | Settle ખાલી → Save | પાર્ટી − રકમ; બિલ બદલાય નહીં (એડવાન્સ) |
| PAY-04 | બે બિલમાં વહેંચીને Settle | બંનેનું Balance/સ્ટેટસ બદલાય |
| PAY-05 | બિલ બાકી 190, Settle 500 | Settled 190 સુધી; Balance 0, Paid |
| PAY-06 | Payment-In Delete | પાર્ટી +, રોકડ −, બિલનું Settled પાછું, સ્ટેટસ પાછું |
| PAY-07 | ⚠️ Payment-In (Settle 300 વાળું) → Edit → કંઈ બદલ્યા વગર Save | અપેક્ષિત: બિલ Balance 190 જ. **હાલ: 490 થઈ જાય** [KI-01](#21) |
| PAY-08 | Payment-Out, Bank HDFC | Bank −; સ્ટેટમેન્ટમાં Withdrawal |
| PAY-09 | Payment-In ના લિસ્ટમાં | Balance/Due કોલમ નથી; *Receipt no* |

### ૨૦.૧૧ એડિટ / ડિલીટ

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| EDT-01 | Sale qty 4 → 6 | stock વધુ −2; પાર્ટી ફરક જેટલું |
| EDT-02 | Sale ની પાર્ટી A → B | A પરથી અસર જાય, B પર આવે |
| EDT-03 | Sale Cash → Bank | Cash −, Bank + |
| EDT-04 | Sale Delete (યાદી ⋮) | ખાતરી સંદેશ; સ્ટોક/પાર્ટી/રોકડ પાછું |
| EDT-05 | બિલ પેજ પરથી Delete | એ પ્રકારની યાદી ખૂલે |
| EDT-06 | Settle થયેલું Sale Edit (qty બદલો) | Settle રકમ સચવાઈ રહે |
| EDT-07 | દરેક એડિટ/ડિલીટ પછી Verify My Data | કોઈ આંકડો ન બદલાય |

### ૨૦.૧૨ યાદી સ્ક્રીન

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| LST-01 | Filter This Month → Last Month → બીજા પેજ પર → પાછા | Last Month જ યાદ |
| LST-02 | From/To જાતે | ડ્રોપડાઉન *Custom* |
| LST-03 | Credit Note યાદી → Unpaid/Unused | Unpaid + Partial + Overdue |
| LST-04 | Excel Report | CSV: Date, Number, Party, Transaction, Payment Type, Amount, Balance, Due Date, Status |
| LST-05 | 🖨️ | બિલ પેજ + પ્રિન્ટ ડાયલોગ |
| LST-06 | 🔍 → પાર્ટીનું નામ | ફક્ત એની લાઇન |
| LST-07 | સર્ચ કરો | ⚠️ સરવાળાનું ખાનું સર્ચ મુજબ નહીં, સમયગાળા મુજબ જ |
| LST-08 | કોઈ ડેટા નહીં | *No Transactions to show* + Add બટન |
| VIEW-01 | બિલ → Share (કમ્પ્યુટર) | *Link copied to clipboard* |
| VIEW-02 | Print | ફક્ત બિલ, સાઇડબાર નહીં |
| VIEW-03 | Gujarat–Gujarat | Tax Summary CGST + SGST |
| VIEW-04 | Gujarat–Maharashtra | IGST |
| VIEW-05 | પાર્ટી State ખાલી | CGST + SGST |
| VIEW-06 | બિલ Discount + Additional Charges | Sub Total − Discount + Tax + Charges + Round Off = Total બરાબર |
| VIEW-07 | Settle થયેલું બિલ | Received = Received + Settle |

### ૨૦.૧૩ પરચેઝ, રિટર્ન, ખર્ચ

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| PUR-01 | Purchase, Paid 0 | સપ્લાયર − Total (Payable વધે); stock + |
| PUR-02 | Debit Note qty 2 | stock −2; સપ્લાયર + Total |
| PUR-03 | Debit Note Received 100 Cash | Cash +100 |
| CN-01 | Credit Note Received 100 Cash | Cash −100 (પાછા આપ્યા) |
| EXP-01 | Category વગર Save | *Choose an expense category* |
| EXP-02 | પાર્ટી ખાલી | *Select or type a party name* ⚠️ [KI-24](#21) |
| EXP-03 | New Expense Category "Electricity", Direct | યાદીમાં; P&L માં *(direct)* |
| EXP-04 | Category ટેબ: Amount vs જમણી યાદી (Last Month) | Amount બધા સમયનું, યાદી ફક્ત Last Month ⚠️ [KI-17](#21) |
| EXP-05 | યાદીની પાર્ટી સાથે Expense, Paid 0 | એ પાર્ટી − Total |
| EXP-06 | Category Delete | એના ખર્ચ Uncategorised |

### ૨૦.૧૪ કેશ, બેંક, ચેક, લોન

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| BANK-01 | નામ વગર Save | ભૂલ |
| BANK-02 | Opening 50,000 → 60,000 | Bank +10,000 તરત; સ્ટેટમેન્ટના ચાલતા બેલેન્સ પણ |
| BANK-03 | બે ખાતાં | ડેશબોર્ડ Bank = સરવાળો |
| BANK-04 | ⚠️ વ્યવહારવાળું ખાતું Delete | એ રકમ Cash/Bank ક્યાંય નહીં [KI-04](#21) |
| BANK-05 | ⚠️ Sale: Payment Type UPI, Bank પસંદ **નહીં**, Received 500 | 500 ક્યાંય નહીં [KI-04](#21) |
| CASH-01 | Adjust Amount 0 | *Enter an amount greater than zero* |
| CASH-02 | Reduce 1,000 | Cash −1,000; *Cash Reduced* લાલ |
| CASH-03 | Adjust Cash પછી Day book | Adjust નથી દેખાતું [KI-16](#21) |
| CHQ-01 | Sale, Cheque + Bank, Received 0 | Open Cheques માં, Receivable |
| CHQ-02 | Payment-In, Cheque | ફક્ત All Cheques માં (Paid છે) [KI-11](#21) |
| LOAN-01 | 1,00,000, 12%, 12 મહિના | Estimated EMI **₹8,884.88** |
| LOAN-02 | 12,000, 0%, 12 | EMI ₹1,000 |
| LOAN-03 | Lender ખાલી → Save | *Lender name is required* |
| LOAN-04 | Record EMI: Total 8,884.88, Interest 1,000 | Principal paid 7,884.88; બાકી 92,115.12; Interest 1,000 |
| LOAN-05 | ⚠️ EMI Cash થી | Cash ઘટવી જોઈએ; હાલ નથી ઘટતી [KI-10](#21) |
| LOAN-06 | ⚠️ Type *Increase Loan*, 10,000 | બાકી વધવું જોઈએ; હાલ ઘટે છે [KI-10](#21) |
| LOAN-07 | Delete Loan | કાર્ડ અને ઇતિહાસ ગાયબ |

### ૨૦.૧૫ રિપોર્ટ્સ

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| RPT-01 | દરેક રિપોર્ટ ખાલી ડેટાબેઝ પર | ભૂલ વગર ખૂલે; *No data for this period* કે શૂન્ય |
| RPT-02 | ખાલી રિપોર્ટ → Excel Report | *Nothing to export for this period* |
| RPT-03 | Party Statement (party વગર URL) | પહેલી પાર્ટી |
| RPT-04 | Party Statement ડ્રોપડાઉન | URL `?partyId=` સાથે બદલાય |
| RPT-05 | Party Statement, સમયગાળો આખો | Closing = પાર્ટીનું બેલેન્સ |
| RPT-06 | Sale Aging: ડ્યુ 40 દિવસ પહેલાં, બાકી 100 | 31–45 માં 100 |
| RPT-07 | Low Stock: Min 0, stock −5 | યાદીમાં **નહીં** |
| RPT-08 | Bill Wise Profit: qty 2 @250 (Purchase 200) | Revenue 500, Cost 400, Profit 100 |
| RPT-09 | ⚠️ Item Wise P&L: આઇટમની 5 ખરીદી + 2 વેચાણ | Qty Sold 2 જોઈએ; હાલ 7 [KI-02](#21) |
| RPT-10 | GSTR 2 | Purchase + Debit Note |
| RPT-11 | HSN Summary | HSN મુજબ ફક્ત Sale |
| RPT-12 | Discount Report | ડિસ્કાઉન્ટવાળા જ; Total = સરવાળો |
| RPT-13 | Balance Sheet | Receivable + Stock = Assets; Net Worth = Assets − Payable |
| RPT-14 | Sale / Purchase બાજુ-મેનુ | સાચી લાઇટ ચાલુ; શીર્ષક Sale Report / Purchase Report |
| RPT-15 | P&L ફિલ્ટર | ડિફોલ્ટ This Financial Year |

### ૨૦.૧૬ યુટિલિટીઝ

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| IMP-01 | Download template (Items) | નમૂનાની CSV |
| IMP-02 | template માં 3 આઇટમ → Import | *Imported 3 records*; Items માં; સ્ટોક ઓપનિંગ જેટલો |
| IMP-03 | એક લાઇનમાં નામ ખાલી | *Row N: Missing item name*; બાકી ઇમ્પોર્ટ |
| IMP-04 | નવી category નામ | Category બને |
| IMP-05 | Parties: હાજર નામ | *"X" already exists — skipped* |
| IMP-06 | Parties: Opening −500 | To Pay 500 |
| IMP-07 | ખોટાં કોલમ નામ | *Nothing could be imported — check the column headings.* |
| IMP-08 | ખાલી CSV | *That file has no data rows* |
| VER-01 | ડેટાબેઝમાં પાર્ટી બેલેન્સ જાતે બગાડો → Verify | સાચું પાછું |
| EXPT-01 | Export Items/Parties/Transactions | ત્રણ CSV; *Exported N …* |
| SET-UP-01 | પગલું 1 ખાલી → Next | ત્રણ ભૂલ |
| SET-UP-02 | ⚠️ પ્રોફાઇલમાં ઈમેલ + લોગો → Setup → Finish | ઈમેલ/લોગો રહેવાં જોઈએ; હાલ ભૂંસાય [KI-03](#21) |
| CLOSE-01 | વર્ષ બદલો | આંકડા એ વર્ષના |
| CLOSE-02 | ⚠️ ગયું વર્ષ → Open full P&L | એ વર્ષનો P&L જોઈએ; હાલ ચાલુ ફિલ્ટર [KI-13](#21) |

### ૨૦.૧૭ સેટિંગ્સ અને પ્રોફાઇલ

| ID | પગલું | અપેક્ષિત |
| --- | --- | --- |
| SETT-01 | કોઈ સ્વિચ બદલો → રીલોડ | સચવાયેલી |
| SETT-02 | QR / barcode scanning બંધ | બિલમાં સ્કેન પટ્ટી નહીં |
| SETT-03 | ⚠️ GST બંધ | બિલમાં GST ન દેખાવો જોઈએ; હાલ કોઈ ફેર નહીં [KI-07](#21) |
| PROF-01 | નામ ખાલી → Save | *Business name is required* |
| PROF-02 | ખોટો GSTIN | *That GSTIN does not look valid* |
| PROF-03 | 500KB લોગો | *Pick an image under 400KB* |
| PROF-04 | નામ બદલો → Save | ટોપબાર, સાઇડબાર, બિલમાં નવું નામ |
| PROF-05 | State બદલો → જૂનું બિલ જુઓ | Tax Summary નવા State મુજબ (છાપતી વખતે ગણાય) |
| PROF-06 | ⚠️ લોગો → બિલ છાપો | લોગો આવવો જોઈએ; હાલ નથી [KI-09](#21) |

---

<a id="21"></a>
## ૨૧. જાણીતી ખામીઓ (હજી સુધારવાની બાકી)

કોડ વાંચતાં મળી છે. સુધારો થાય ત્યારે અહીંથી કાઢીને "ફેરફારની નોંધ" માં લખવું.

| ID | ખામી | અસર | ટેસ્ટ |
| --- | --- | --- | --- |
| **KI-01** | Payment-In/Out **એડિટ** કરતાં ફોર્મ જૂનું Settle નથી લાવતું, એટલે સેવ થતાં Settle નીકળી જાય | બિલ પાછું Unpaid/વધુ બાકી દેખાય, જ્યારે પાર્ટી બેલેન્સ સાચું રહે — બંને મેળ ન ખાય | PAY-07 |
| **KI-02** | Item Wise Profit And Loss માં Qty Sold/Revenue માં **ખરીદી, રિટર્ન, ઓર્ડર અને બધી તારીખ** ની લાઇનો પણ ગણાય | નફો ખોટો | RPT-09 |
| **KI-03** | Set Up My Business → *Finish Setup* ફક્ત 7 ખાનાં મોકલે, બાકી (ઈમેલ, પિનકોડ, લોગો, સહી, Books Beginning Date) ખાલી થાય | ડેટા ગુમાય | SET-UP-02 |
| **KI-04** | Payment Type Cash સિવાયનો હોય અને બેંક ખાતું ન હોય (કે ખાતું ડિલીટ થાય) તો રકમ ન રોકડમાં, ન બેંકમાં | રોકડ/બેંક ઓછાં દેખાય | BANK-04, BANK-05 |
| **KI-05** | સ્ટેટસ સેવ વખતે જ નક્કી થાય; Due Date વીતે તો આપોઆપ Overdue નથી થતું | Overdue ફિલ્ટર અધૂરું | FORM-18 |
| **KI-06** | Convert પછી Estimate/Order *Open* રહે | ડેશબોર્ડ Open Orders વધારે; બે વાર કન્વર્ટ થઈ શકે | FORM-14 |
| **KI-07** | Settings ની સ્વિચ (QR scanning સિવાય) અને Currency/Date Format ની કોઈ અસર નથી | યુઝર ગૂંચવાય | SETT-03 |
| **KI-08** | Credit Limit ની ચેતવણી નથી | — | PTY-13 |
| **KI-09** | લોગો/સહી છાપેલા બિલમાં નથી | — | PROF-06 |
| **KI-10** | લોન: EMI/લોન રકમ રોકડ/બેંકમાં નથી જતી; *Increase Loan* પણ બાકી ઘટાડે; Charges/Processing Fee પણ મુદ્દલ ગણાય | લોન અને રોકડના આંકડા ખોટા | LOAN-05, LOAN-06 |
| **KI-11** | ચેક નંબરનું ખાનું નથી; ચેકથી આવેલાં Payment કદી *Open Cheques* માં નથી આવતાં | ચેક ટ્રેક ન થાય | CHQ-02 |
| **KI-12** | Party to Party: ફોર્મમાં આઇટમ લાઇન, રકમ *Received* માંથી, ફક્ત એક પાર્ટી; Journal Entry ની કોઈ હિસાબી અસર નથી | ટ્રાન્સફર અધૂરું | — |
| **KI-13** | Close Financial Year → *Open full P&L* પસંદ કરેલું વર્ષ નથી ખોલતું | — | CLOSE-02 |
| **KI-14** | P&L: Sale/Purchase GST સાથે; Opening/Closing Stock સમયગાળા મુજબ નહીં | નફો ખોટો | E2E-20 |
| **KI-15** | Balance Sheet માં રોકડ/બેંક નથી; Balance Sheet અને Sale Aging માં ફિલ્ટરની અસર નથી | — | RPT-13 |
| **KI-16** | Day book / Cash flow માં Cash Adjustment નથી | — | CASH-03 |
| **KI-17** | Expense Category યાદીનો Amount બધા સમયનો, જમણી યાદી સમયગાળાની | — | EXP-04 |
| **KI-18** | સર્ચ: ટ્રાન્ઝેક્શન ફક્ત ચાલુ વર્ષ; પાર્ટી/આઇટમ ક્લિક પર એ રેકોર્ડ પસંદ નથી થતો | — | SRCH-03 |
| **KI-19** | Items ⋮ → Bulk Inactive/Active ફક્ત સંદેશ | — | — |
| **KI-20** | બધા લોગિન એક જ બિઝનેસ જુએ; યુઝર મુજબ અલગ હિસાબ નથી | ખાનગીપણું | — |
| **KI-21** | Service આઇટમ બિલમાં જાય તો એનો (છુપો) સ્ટોક પણ ઘટે | સ્ક્રીન પર નથી દેખાતું; ડેટામાં માઇનસ | — |
| **KI-22** | Credit Note ફોર્મમાં *Received* લખ્યું છે પણ એ પાછી આપેલી રકમ છે (બિલ પેજ પર *Paid*) | ગૂંચવણ | CN-01 |
| **KI-23** | યાદીનું સરવાળાનું ખાનું સર્ચ/સ્ટેટસ ફિલ્ટર ગણતું નથી | — | LST-07 |
| **KI-24** | Expense ફોર્મમાં પાર્ટી ફરજિયાત અને *Customer* લખેલું | — | EXP-02 |
| **KI-25** | Payment-In માં Settle નો સરવાળો Amount થી વધુ હોય તો પણ એપ રોકતી નથી | — | — |

---

<a id="22"></a>
## ૨૨. ફેરફારની નોંધ

| તારીખ | ફેરફાર | દસ્તાવેજમાં ક્યાં |
| --- | --- | --- |
| 2026-09-17 | દસ્તાવેજ શરૂ: આખી એપનું વર્ણન, અસરનું કોષ્ટક, ટેસ્ટ કેસ, 25 જાણીતી ખામીઓ (કોડ વાંચીને) | બધા વિભાગ |
| 2026-09-18 | **ડિસ્કાઉન્ટ માટે ડ્રોપડાઉન:** લાઇન અને બિલ ડિસ્કાઉન્ટ બાજુનાં % / ₹ બટનને બદલે હવે ડ્રોપડાઉન. લાઇન ડિસ્કાઉન્ટ ડિફોલ્ટ **%**, બિલ (Subtotal નીચેનું) ડિસ્કાઉન્ટ ડિફોલ્ટ **₹** (પહેલાં %). હિસાબ બદલાયો નથી. | વિભાગ ૯ (આઇટમ લાઇન, ચુકવણી અને સરવાળો); ટેસ્ટ CALC-06, CALC-15, CALC-16 |
| 2026-09-18 | **ડેશબોર્ડ પ્રીમિયમ દેખાવ:** આખી એપ પાછળ એક જ ગરમ પ્રકાશ — ડાબે હળવો ઠંડો, જમણે ઉપરથી પીળો; મોટું સફેદ કન્ટેનર કાઢ્યું, હવે કાર્ડ સીધાં પ્રકાશિત બેકગ્રાઉન્ડ પર. કાર્ડ અર્ધપારદર્શક કાચ જેવાં, પાતળી ચમકતી કિનારી અને બહુ હળવો પડછાયો. સાઇડબારમાં ઉપર *Dhandho* નામ; ચાલુ મેનુ કાળી પિલ, પીળો આઇકન અને આછી ચમક. ડેશબોર્ડની ગોઠવણ: ઉપર શુભેચ્છા + Invoices / Open orders / Low stock (આઇકન સાથે); પછી Total Receivable, Total Payable, Total Sale ના ત્રણ કાર્ડ; પછી *Sales Overview* ચાર્ટ (સોનેરી લાઇન, હળવી ચમક, ટપકાંવાળી ગ્રિડ, સફેદ tooltip *Sales: ₹…*) અને જમણે કાળું WhatsApp કાર્ડ (લીલું આઇકન, *Connect →*), Open Orders; પછી Cash In Hand, Bank Balance, Stock Value; છેલ્લે Most Used Reports (આઇકન સાથે, *View All →*). **બધા આંકડા, લિંક અને બટન એ જ — ફક્ત દેખાવ અને ગોઠવણ.** | વિભાગ ૪, ૫ |
| 2026-09-18 | **પેજના પટ્ટા પણ કાચ જેવા:** ઉપરની પટ્ટી, *Filter by* ની પટ્ટી, ટેબ (Products/Services/Category/Units), ડાબી યાદીની કોલમ અને જમણી વિગતની જગ્યા — બધાં હવે અર્ધપારદર્શક અને ધૂંધળાં, એટલે પાછળનો રંગ દેખાય. ચાલુ ટેબ નીચે પીળી લીટી. | વિભાગ ૪, ૬, ૭, ૧૦ |
| 2026-09-18 | **યાદી (ટેબલ) નો નવો દેખાવ:** કોલમનાં નામ નાનાં કેપિટલ અક્ષરે, લાઇનો પહોળી અને હળવી, પસંદ કરેલી લાઇન પીળી, સ્ટેટસ પિલમાં પાતળી કિનારી, અને Parties ની યાદીમાં નામ આગળ પહેલા અક્ષરનું ગોળ ચિહ્ન. કોઈ કોલમ, ફિલ્ટર કે ક્રમ બદલાયો નથી. | વિભાગ ૬, ૧૦ |
| 2026-09-18 | **નવો દેખાવ અને નવું નામ:** એપનું નામ **ધંધો (Dhandho)** થયું — ટાઇટલ, સાઇડબારનાં *Dhandho POS* / *Dhandho Network* અને માહિતી પેજનું લખાણ. દેખાવ બદલાયો: ક્રીમ રંગનું બેકગ્રાઉન્ડ, પાછળ ધૂંધળા રંગનાં વાદળ, કાચ જેવી (અર્ધપારદર્શક) સાઇડબાર-ટોપબાર-પેનલ, ગોળ ખૂણાવાળાં કાર્ડ, કાળી પિલવાળું *Add Sale* અને પીળું *Add Purchase*, સાઇડબારમાં ચાલુ મેનુ કાળી પિલમાં, ડેશબોર્ડ પર ઉપર બિઝનેસનું નામ અને Invoices / Open orders / Low stock ના મોટા આંકડા, પીળી છાંટવાળું Total Sale કાર્ડ અને કાળું WhatsApp કાર્ડ. **કોઈ પણ હિસાબ, બટનનું કામ કે સ્ક્રીનની ગોઠવણ બદલાઈ નથી — ફક્ત રંગ-રૂપ.** | વિભાગ ૪, ૫; બધા સ્ક્રીનશોટ |
| 2026-09-17 | **લેબલ પ્રિન્ટ — પ્રિન્ટર મુજબ:** 16 તૈયાર stock (thermal roll 1/2/3 across, receipt 58/80 mm, A4 Avery sheets) + Custom માપ; લેબલ માપ મુજબ QR ઉપર/ડાબે આપોઆપ; QR ખાનાં પ્રિન્ટરનાં ટપકાં (203/300 dpi) મુજબ; Link / Code only QR; Error correction; Move right/down; Skip used labels; outlines; સાચા mm નું preview; ચેતવણીઓ; છુપા ફ્રેમથી પ્રિન્ટ (પોપ-અપ નહીં); alignment test પેજ; TSPL/ZPL ફાઇલ; પસંદગી બિઝનેસ settings માં. QR મોડલ હવે ફક્ત Download + *Print Labels…* (સીધું Item QR Labels પર). | વિભાગ ૮; ટેસ્ટ QR-08…QR-16, ૨૦.૭-ક (LBL-01…35) |
| 2026-09-17 | **આઇટમ કોડ અને QR લેબલ:** દરેક આઇટમનો અનોખો કોડ (ખાલી → `ITM00042`), QR મોડલ (Download/Print), Utilities → Item QR Labels, ફોન માટે `/i/<code>` પેજ (Sell/Purchase/Adjust), બિલ ફોર્મમાં સ્કેન પટ્ટી + કેમેરા, Settings → QR / barcode scanning ડિફોલ્ટ ચાલુ, Import માં કોડ નિયમ, `npm run db:item-codes` | વિભાગ ૭, ૮, ૯, ૧૬, ૧૭; ટેસ્ટ ૨૦.૭ |
