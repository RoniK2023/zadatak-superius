# Mandrač Loyalty — program vjernosti za kafiće i male obrtnike

## Problem korisnika

Marko (Caffe bar Mandrač, Pula — centar i Verudela) želi potaknuti stalne goste da se češće vraćaju i više troše, nagrađujući ih besplatnim kavama i pićima. Gost treba osjetiti da je dobio nešto vrijedno, a program istovremeno mora ostati profitabilan za Marka. Najviše ga brine isplati li se program i mogu li ga konobari zloupotrijebiti dijeljenjem bodova prijateljima. Hoće li program raditi, Marko želi znati iz konkretnih brojki: tko su mu najbolji gosti, koliko ga nagrade stvarno koštaju i koliko članovi programa troše.

Budući da Superius rješenje prodaje stotinama sličnih obrta, Mandrač je tretiran kao **jedna konfiguracija** općeg sustava: pravila bodovanja, istek bodova, nagrade, happy hour i lokacije su postavke vlasnika, a ne kodirana pravila.

## Uloge

| Uloga | Što radi |
|---|---|
| **Gost** | Registrira se, ima QR karticu, vidi bodove, nagrade i što ističe |
| **Konobar** | Skenira gostov QR uz račun, iskorištava nagradu za gosta |
| **Vlasnik** | Postavke programa, lokacije, konobari, katalog nagrada, analitika, log aktivnosti |
| **Superadmin** (Superius) | Dodaje vlasnike/firme — u MVP-u samo kroz seed |

Svi koriste isti login (email + lozinka) i preusmjeravaju se prema ulozi.

## User storyji

### Gost

**G1 — Registracija na licu mjesta**
Kao gost, želim se registrirati skeniranjem QR koda na šanku, kako bih odmah počeo skupljati bodove.
- QR na šanku vodi na stranicu za registraciju (email + lozinka).
- Nakon registracije gost odmah vidi svoj osobni QR kod.
- Registracija ne zahtijeva instalaciju aplikacije.
- Isti račun vrijedi na svim lokacijama firme uključenima u program.

**G2 — Pregled bodova**
Kao gost, želim vidjeti stanje bodova, kako bih znao koliko mi fali do nagrade.
- Gost vidi trenutni broj važećih bodova.
- Za svaku nagradu vidi koliko mu bodova nedostaje.
- Vidi kada mu bodovi istječu (datum resetiranja na nulu).
- Vidi povijest: zarade i potrošnje s datumom i lokacijom.

**G3 — Kartica za spremanje**
Kao gost, želim preuzeti svoju karticu kao PDF, kako bih je imao pri ruci i bez prijave.
- Gost može preuzeti PDF s QR kodom i imenom programa.
- QR s PDF-a konobar skenira jednako kao QR u browseru.

### Konobar

**K1 — Dodjela bodova uz račun**
Kao konobar, želim skenirati gostov QR uz izdani račun, kako bi gost dobio bodove bez ručnog unosa.
- Bodovi se računaju automatski iz računa prema pravilu programa (po iznosu ili po označenim artiklima).
- Konobar ne može ručno upisati iznos ni broj bodova.
- Jedan račun može dobiti bodove samo jednom; drugi pokušaj je odbijen s porukom.
- Svako skeniranje se bilježi: konobar, gost, račun, lokacija, vrijeme.
- Ako lokacija nije uključena u program, bodovi se ne dodjeljuju.

**K2 — Iskorištavanje nagrade**
Kao konobar, želim iskoristiti nagradu za gosta, kako bi gost dobio besplatan artikl.
- Konobar skenira QR i vidi nagrade koje gost može dobiti.
- Nagrada se može iskoristiti samo ako gost ima dovoljno važećih bodova.
- Iskorištavanje se bilježi u log (konobar, gost, nagrada, lokacija, vrijeme).

### Vlasnik

**V1 — Postavke programa**
Kao vlasnik, želim podesiti pravila programa, kako bi odgovarao mom poslovanju.
- Vlasnik bira način bodovanja:
  - **po iznosu** — npr. 1 bod po potrošenom €;
  - **po artiklu** — vlasnik označi artikle koji nose bodove i koliko (npr. kava = 1 bod), a ostali artikli ne nose bodove.
- Bodovi uz račun računaju se prema načinu bodovanja koji je aktivan u trenutku izdavanja računa.
- Vlasnik bira način isteka; kad istek nastupi, gostu se **svi bodovi resetiraju na nulu**:
  - **isti datum za sve** — fiksni datum (npr. 31.12.) ili razdoblje (npr. svakih 6 mjeseci od početka programa);
  - **neaktivnost** — ako gost ne dođe N mjeseci; svaki posjet s dodjelom bodova ponovno pokreće odbrojavanje.
- Vlasnik uključuje/isključuje happy hour i postavlja termine.
- Vlasnik bira na kojim lokacijama program vrijedi.
- Promjena pravila bodovanja vrijedi samo za **nove** račune; promjena isteka ne briše postojeće bodove odmah, nego se novi datum isteka računa od trenutka promjene.

**V2 — Katalog nagrada**
Kao vlasnik, želim definirati nagrade i koliko bodova vrijede, kako bih kontrolirao trošak.
- Vlasnik dodaje nagradu: naziv, broj bodova, nabavna cijena (npr. kava — 10 bodova — 0,30 €).
- Vlasnik može deaktivirati nagradu.

**V3 — Isplativost programa**
Kao vlasnik, želim vidjeti koliko me program košta i što donosi, kako bih znao isplati li se.
- **Trošak**: zbroj iskorištenih nagrada po nabavnoj cijeni.
- **Obveza**: broj i procijenjena vrijednost neiskorištenih, neisteklih bodova.
- **Učinak**: ukupna potrošnja članova programa.
- Sve se može filtrirati po razdoblju i lokaciji.

**V4 — Najbolji gosti**
Kao vlasnik, želim vidjeti najbolje goste, kako bih znao tko mi je najvrjedniji.
- Lista gostiju sortirana po potrošnji u razdoblju.
- Za svakog: potrošnja, broj posjeta, zadnji posjet, lokacija koju najčešće posjećuje.

**V5 — Kontrola zloupotrebe**
Kao vlasnik, želim vidjeti tko je kome dodijelio bodove, kako bih otkrio zloupotrebu.
- Log svih dodjela i iskorištavanja, filtriran po konobaru, gostu i lokaciji.
- U logu su vidljivi i odbijeni pokušaji (već bodovan račun, happy hour, lokacija izvan programa) s razlogom.
- ~~Označene su sumnjive aktivnosti: npr. isti konobar skenira istog gosta više od N puta dnevno.~~ *Uklonjeno iz MVP-a — vidi "Svjesno izostavljeno".*

**V6 — Lokacije i osoblje**
Kao vlasnik, želim dodavati lokacije i konobare, kako bih program proširio na cijelo poslovanje.
- Vlasnik dodaje lokacije i konobare (email + lozinka).
- Konobar je vezan uz lokaciju na kojoj radi i može bodovati samo današnje račune svoje lokacije.

### Rubni slučajevi

- **Happy hour** — *Zadano* je da je happy hour uključen i u tijeku, *kada* konobar skenira gostov QR uz račun, *tada* se bodovi ne dodjeljuju i nagrade se ne mogu iskoristiti.
- **Istek zbog neaktivnosti** — *Zadano* je da je istek postavljen na 12 mjeseci neaktivnosti i gost ima 40 bodova, *kada* gost ne dođe 12 mjeseci, *tada* mu se bodovi resetiraju na 0; ako dođe prije isteka, odbrojavanje kreće ispočetka.
- **Promjena isteka** — *Zadano* je da gost ima bodove, *kada* vlasnik skrati istek, *tada* gost ne gubi bodove istog trena, nego novi rok kreće od trenutka promjene.
- **Dupli račun** — *Zadano* je da je račun već bodovan, *kada* ga konobar pokuša skenirati ponovno, *tada* sustav odbija dodjelu i bilježi pokušaj.
- **Lokacija izvan programa** — *Zadano* je da program vrijedi samo za Verudelu, *kada* gost dođe u centar, *tada* ne skuplja i ne troši bodove.

## Pretpostavke

- Marko još nije odlučio između bodovanja po kavi i po iznosu, pa sustav podržava **oba načina** kao postavku. Njegova ideja "10 kava = kava gratis" postavlja se kao bodovanje po artiklu (kava = 1 bod) i nagrada "kava" za 10 bodova.
- Za Mandrač je **default bodovanje po iznosu**, jer bodovanje po kavi ne nagrađuje goste koji plaćaju cijelu turu. Marko to može promijeniti jednim klikom.
- Bodovi se računaju na **stvarno plaćeni iznos**.
- U happy houru nema bodova ni nagrada (nema popusta na popust).
- Bodovi nastaju isključivo iz računa. U produkciji je to fiskalizirani račun iz Superius POS-a; u MVP-u je račun **simuliran** (artikli i cijene iz cjenika, broj računa, lokacija, konobar). Konobar ne može mijenjati cijene.
- Gost pripada firmi, a ne lokaciji; za Mandrač program vrijedi na obje lokacije.
- Istekom se resetiraju **svi** bodovi gosta odjednom, a ne pojedinačno po datumu zarade. Tako je pravilo jednostavno za objasniti gostu i ne zahtijeva praćenje svakog boda zasebno.
- Default za Mandrač: po iznosu, 1 bod/€, istek nakon 12 mjeseci neaktivnosti, happy hour bez bodova. Time bodovi ne vrijede vječno, a aktivni stalni gosti ih ne gube, što je cilj programa.
- Rizik krađe bodova preko screenshota QR-a je nizak za vrijednost nagrade (kava) i prihvaćen je u MVP-u.
- Trošak programa računa se po **nabavnoj** cijeni nagrade, ne po prodajnoj.

Dodatne pretpostavke donesene tijekom izrade:

- **Pravilo bodovanja u trenutku izdavanja računa.** Pravilo (način + stopa, bodovi po artiklu) zapisuje se na račun kad se izda i po njemu se boduje (V1: "promjena vrijedi samo za nove račune"). Isti zapis sprema se na transakciju kao `ruleSnapshot`. Budući da se boduju samo današnji računi, razlika u odnosu na "pravilo u trenutku dodjele" je najviše nekoliko sati, a ovako vlasnik ne može naknadno promijeniti vrijednost već izdanog računa.
- **Happy hour** — dok happy hour traje, konobar ne može dodijeliti bodove (ni za račun izdan prije happy houra) ni iskoristiti nagradu; pokušaj se odbija i bilježi u log, a konobarsko sučelje te akcije tada prikazuje kao blokirane. Račun izdan u happy houru ne nosi bodove ni nakon što happy hour završi. Blagajna (izdavanje računa) radi normalno.
- **Račun koji ne nosi bodove** (npr. bodovanje po artiklu, a na računu je samo voda) i dalje se može skenirati: bilježi se dodjela s 0 bodova, tako da se posjet i potrošnja vide u analitici, a račun je "iskorišten".
- **Učinak (potrošnja članova)** zbraja račune koje je konobar povezao s gostom skeniranjem izvan happy houra. Računi iz happy houra nisu povezani s gostom pa nisu u zbroju.
- **Istek na fiksni datum** — bodovi vrijede do kraja tog dana (npr. cijeli 31. 12.). Ako mjesec nema toliko dana (29. 2.), uzima se zadnji dan mjeseca.
- **Gost bez ijedne aktivnosti** — odbrojavanje kreće od registracije.
- **Obveza** je trenutno stanje svih važećih bodova (ne ovisi o filtru razdoblja/lokacije, jer su bodovi zajednički za sve lokacije). Bodovi koji bi istekli pri sljedećem učitavanju ne ulaze u obvezu.
- **Email je jedinstven** u cijelom sustavu; gost pripada jednoj firmi.
- Nagrada ili artikl koji je već korišten ne može se obrisati (da povijest ostane točna) — može se deaktivirati.

## Svjesno izostavljeno

| Što | Zašto |
|---|---|
| Apple / Google Wallet | Zahtijeva developer račune, certifikate i odobrenja — nije izvedivo u 4 sata |
| Prava integracija s POS-om i fiskalizacijom | Ovisi o Superius sustavu; račun je simuliran |
| Google login | Dodatni auth tok; email + lozinka pokrivaju MVP |
| Superadmin UI | Vlasnici se dodaju kroz seed; ne utječe na loyalty tok |
| PIN prijava konobara na uređaju lokacije | Realniji tok za smjene, ali email + lozinka su dovoljni za demo |
| Bodovanje po kategorijama i kombinirana pravila | Po iznosu i po artiklu pokrivaju Markove dvije ideje; složenija pravila dodaju se kad postoji stvarna potreba |
| Rotirajući QR, notifikacije o isteku, marketing kampanje | Vrijednost tek kad osnovni tok radi |
| Automatsko označavanje sumnjivih aktivnosti (V5) | Pragovi (koliko je dodjela istom gostu "previše") nisu dogovoreni s vlasnikom, a izmišljena pravila davala su lažne uzbune za stalne goste. Vlasnik u logu aktivnosti vidi sve dodjele, nagrade i odbijene pokušaje (s razlogom), filtrirane po konobaru, gostu, lokaciji i vrsti. |

## Sljedeći koraci

1. Spajanje na Superius POS — bodovi automatski iz fiskaliziranog računa.
2. PIN prijava konobara na uređaju lokacije.
3. Google login i Apple / Google Wallet kartica.
4. Notifikacije gostu prije isteka bodova.
5. Kombinirana pravila bodovanja (kategorije, iznimke) i kampanje (npr. dvostruki bodovi utorkom).
6. Superadmin sučelje za onboarding novih firmi.
7. Označavanje sumnjivih aktivnosti — kad s vlasnikom dogovorimo pragove.

## Pokretanje

Potreban je samo Docker (Docker Desktop ili Docker Engine s Compose v2).

```bash
docker compose up --build
```

Prvo pokretanje primjenjuje migracije i puni bazu demo podacima (traje ~1 minutu zbog builda). Seed je idempotentan — ponovno pokretanje kontejnera ne duplicira podatke.

| Što | Adresa |
|---|---|
| Aplikacija | http://localhost:8080 |
| Registracija gosta (URL iza QR koda na šanku) | http://localhost:8080/r/mandrac |
| API (health) | http://localhost:4000/api/health |
| PostgreSQL | `localhost:5432`, baza `mandrac_loyalty`, korisnik/lozinka `mandrac` / `mandrac` |

### Seed korisnici

Lozinka za sve: **`demo1234`** (demo računi su navedeni i na stranici za prijavu — klik popunjava formu).

| Uloga | Email | Napomena |
|---|---|---|
| Vlasnik | `owner@mandrac.hr` | Marko, Caffe bar Mandrač |
| Konobar — Centar | `konobar.centar@mandrac.hr` | Ana Kovač |
| Konobar — Verudela | `konobar.verudela@mandrac.hr` | Petar Babić |
| Gost (demo) | `gost@example.com` | Ivana Horvat, QR kod **`DEMO-GOST-2026`** |
| Superadmin | `admin@superius.hr` | samo popis firmi |

Seed sadrži i: cjenik od 14 artikala, 3 nagrade (kava 10 bodova / 0,30 €, bezalkoholno piće 15 / 0,60 €, pivo 20 / 0,90 €), ~30 gostiju s ~3 mjeseca povijesti na obje lokacije, nekoliko odbijenih pokušaja (već bodovan račun, premalo bodova, račun nije današnji), gosta čiji bodovi istječu pri sljedećem učitavanju (Ivan Starić, zadnja aktivnost prije 13 mjeseci) te po tri **današnja nebodovana računa** na svakoj lokaciji. Današnji računi se dodaju pri svakom pokretanju ako lokacija toga dana još nema otvorenih računa.

### Demo glavnog toka

1. **Konobar izdaje račun** — prijava kao `konobar.centar@mandrac.hr` → na početnom zaslonu *Blagajna* → dodirnite nekoliko artikala → *Izdaj račun* → *Dodaj bodove gostu*. (Ili odmah *Dodaj bodove* i odaberite jedan od današnjih seed računa.)
2. **Konobar skenira gosta** — *Skeniraj QR kod gosta* (kamera) ili ručni unos koda `DEMO-GOST-2026` → prikaže se koliko je bodova dodijeljeno i novo stanje. Ponovni pokušaj s istim računom odbija se s porukom i bilježi u log.
3. **Gost vidi bodove** — u drugom pregledniku (ili privatnom prozoru) prijava kao `gost@example.com` → *Moja kartica* (QR, stanje, rok isteka), *Nagrade* (koliko nedostaje), *Povijest*, *Preuzmi PDF*.
4. **Vlasnik vidi transakciju** — prijava kao `owner@mandrac.hr` → *Pregled* (KPI-jevi, nedavna aktivnost) → *Aktivnost* (log svih dodjela, nagrada i odbijenih pokušaja s filtrima po konobaru, gostu, lokaciji i vrsti).
5. **Nagrada** — konobar → *Iskoristi nagradu* → kod `DEMO-GOST-2026` → *Iskoristi* → potvrda.

> **Happy hour** je u seedu uključen radnim danom 17:00–19:00 (Europe/Zagreb). Dok traje, dodjela bodova i nagrade su (namjerno) blokirani. Za demo u to vrijeme isključite ga kao vlasnik u *Postavke programa → Happy hour*.
>
> **Kamera** radi na `localhost` (sigurni kontekst). Na mobitelu preko lokalne mreže preglednik traži HTTPS — tada koristite ručni unos koda ili PDF.

### Testovi

Poslovna pravila su pokrivena Vitest testovima (`server/tests`):

```bash
cd server
npm install
npm test
```

ili u pokrenutom kontejneru: `docker compose exec server npm test`.

### Lokalni razvoj (bez Dockera za aplikaciju)

Potrebni su Docker (za bazu) i **Node.js 22+**. Ako je cijeli stack već pokrenut, najprije ugasite njegov API i frontend da se oslobode portovi 4000 i 8080: `docker compose stop server client`.

**Terminal 1 — baza i API** (iz korijena repozitorija):

```bash
docker compose up -d db
cd server
cp .env.example .env
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev            # API na http://localhost:4000 (ostaje pokrenut)
```

**Terminal 2 — frontend** (iz korijena repozitorija):

```bash
cd client
npm install
npm run dev            # http://localhost:5173 (zahtjevi na /api idu na :4000)
```

Seed je idempotentan pa se `npm run db:seed` može pokrenuti više puta. Ako je baza već napunjena kroz `docker compose up`, preskače se.

Potpuni reset podataka: `docker compose down -v` (briše bazu; sljedeće pokretanje ponovno puni demo podatke).

## Tehničke odluke

- **Struktura** — jedan repozitorij, `/server` i `/client` sa zasebnim `package.json`, `docker-compose.yml` u korijenu. Bez TypeScripta i monorepo alata.
- **Poslovna logika u čistim funkcijama** (`server/src/domain/`): izračun bodova, happy hour, istek, provjere dodjele/iskorištavanja, analitika. Ne znaju za Express ni bazu pa se testiraju bez baze. `services/` radi I/O i transakcije, rute su tanke.
- **Novac u centima** (`Int`), stopa bodova kao `Decimal` — nema grešaka zaokruživanja. `floor(iznos × stopa)` je zaštićen od float šuma (npr. 4,35 × 100).
- **Jedan račun = jedna dodjela** je zajamčeno i u bazi: `PointTransaction.receiptId` je `UNIQUE` (samo EARN ga ima). Dva istovremena skeniranja istog računa → drugo dobiva grešku i bilježi se kao odbijeni pokušaj.
- **Konkurentnost po gostu** — dodjela, iskorištavanje i istek zaključavaju red gosta (`SELECT … FOR UPDATE`) u transakciji, pa stanje ne može otići u minus ni se dvaput resetirati.
- **Lijeni istek** — provjerava se i primjenjuje kad gost otvori svoju karticu, kad ga konobar skenira, pri dodjeli i iskorištavanju (bez crona). Na resetu nastaje `EXPIRE` transakcija s negativnim iznosom i postavlja se `lastResetAt`. Pregled vlasnika istek računa "virtualno" (bez zapisa) da obveza ne bi uključivala istekle bodove.
- **Vremenska zona** — sva pravila (happy hour, "današnji" račun, istek) računaju se u `Europe/Zagreb` pomoću Luxona, neovisno o zoni poslužitelja; testovi pokrivaju i ljetno vrijeme.
- **Autorizacija i izolacija firmi** — JWT (7 dana) u `Authorization` zaglavlju; na svakom zahtjevu korisnik se ponovno učitava iz baze (uloga, firma, lokacija, aktivnost). Nijedan endpoint ne prima `tenantId`; svaki upit je ograničen na firmu prijavljenog korisnika, a dohvat po ID-u provjerava pripadnost firmi. Konobar vidi samo račune svoje lokacije i gosta kojeg skenira; gost samo sebe.
- **bcrypt** preko `bcryptjs` (ista bcrypt shema, čisti JS) — nema nativnog builda u Docker slici.
- **QR token** — 12 nasumičnih znakova iz abecede bez dvosmislenih znakova (npr. `K7M2-QX9P-4TRA`, ~5·10¹⁷ kombinacija), nije vezan uz ID korisnika. QR sadrži samo token; ručni unos tolerira mala slova, razmake i crtice.
- **PDF kartica** se generira na poslužitelju (`pdfkit`) s ugrađenim fontom Inter jer standardni PDF fontovi nemaju č/ć/đ. QR na PDF-u je isti token kao u aplikaciji.
- **Brojevi računa** su redni po firmi (`UNIQUE(tenantId, number)`), uz ponovni pokušaj pri istovremenom izdavanju.
- **Seed** koristi deterministički generator slučajnih brojeva (isti podaci pri svakom svježem pokretanju), cijeli se izvršava u jednoj transakciji i preskače se ako firma `mandrac` već postoji.
- **Log aktivnosti** spaja transakcije i odbijene pokušaje u memoriji (do 2000 zapisa po izvoru za odabrano razdoblje) i stranici ih s "Učitaj još". Za MVP je to dovoljno; za veće firme ide paginacija u SQL-u.
- **Frontend** — React + Vite + Tailwind v3 s **zamijenjenom** temom (boje, radijusi, razmaci, tipografija, sjene), tako da se mogu koristiti samo definirani tokeni. Smjer "jadranski kafić": topla gotovo-bijela pozadina (#FAF8F5), bijele površine, kameni tonovi za tekst i rubove, i **jedan** naglasni ton — duboko morsko plava (#0F4C5C) — za primarne akcije, aktivnu navigaciju i napredak; zelena/jantarna/crvena samo za status. Font Manrope (self-hosted, `@fontsource`), skala 12/14/16/20/24/32 (+ dvije veličine samo za istaknute brojeve), tabularne brojke svugdje, radijus 12 px za kartice i 10 px za kontrole, jedna sjena za kartice i jača samo za modale. Novac i datumi u hr-HR obliku (1.234,50 €, 2. 11. 2026.). Ikone `lucide-react`. Konobar ima početni zaslon s tri velike akcije i rezultate čitljive s udaljenosti; gost ima karticu vjernosti (QR, kod, stanje bodova, napredak do nagrada). Zajednički `AppShell` po ulozi: bočna navigacija na desktopu, donja navigacija i sticky naslovna traka na mobitelu. Mali skup komponenti (Button, Input/Select/Switch, Card, Badge, DataList tablica→kartice, Modal/ConfirmDialog, Toast, EmptyState, Skeleton, ErrorState).
- **Skeniranje** — `html5-qrcode` se učitava tek kad konobar uključi kameru; ručni unos je uvijek vidljiv.
- **Docker** — `db` (Postgres 16), `server` (migracije → seed → API), `client` (Vite build posluživan nginxom koji `/api` prosljeđuje serveru).
- **Demo računi na stranici za prijavu** olakšavaju pregled; u produkciji se uklanjaju.

## Stack

React (JSX, Vite, Tailwind) · Express 5 (JavaScript, ES moduli) · PostgreSQL + Prisma · Vitest · Docker Compose
