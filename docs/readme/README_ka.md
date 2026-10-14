<div align="center">

[English](../../README.md) · [简体中文](README_zh.md) · [繁體中文](README_zh-TW.md) · [日本語](README_ja.md) · [한국어](README_ko.md) · [Türkçe](README_tr.md) · [Русский](README_ru.md) · [Tiếng Việt](README_vi.md) · [ไทย](README_th.md) · [Deutsch](README_de.md) · [Español](README_es.md) · [Français](README_fr.md) · [Українська](README_uk.md) · [Polski](README_pl.md) · [Português (Brasil)](README_pt-BR.md) · [العربية](README_ar.md) · [فارسی](README_fa.md) · [Bahasa Indonesia](README_id.md) · [Italiano](README_it.md) · [Ελληνικά](README_el.md) · **ქართული**

# REA: Reverse Engineer Anything

### ერთი MCP უკუინჟინერიისთვის — ბინარული ფაილებიდან აპლიკაციებსა და runtime-მდე.

**იპოვე საინტერესო ფუნქცია? გაიგე, როგორ მუშაობს — ბინარულ დონემდე.**

[![npm version](https://img.shields.io/npm/v/rea-agents?style=flat-square&color=cb3837)](https://www.npmjs.com/package/rea-agents)
[![MCP tool catalog](https://img.shields.io/badge/MCP-tool_catalog-5c4ee5?style=flat-square)](../mcp-contracts.md#generated-catalog)
[![Node.js requirements](https://img.shields.io/badge/Node.js-requirements-339933?style=flat-square&logo=nodedotjs&logoColor=white)](#რისი-ანალიზი-შეგიძლია)
[![skills.sh](https://skills.sh/b/morluto/rea?style=flat-square)](https://skills.sh/morluto/rea/reverse-engineer-anything)
[![MIT license](https://img.shields.io/badge/license-MIT-f4c430?style=flat-square)](../../LICENSE)
[![Discord](https://img.shields.io/discord/1556595354999332884?logo=discord&logoColor=white&label=Discord&color=5865F2)](https://discord.gg/GkcryMnJDM)

<a href="https://trendshift.io/repositories/82054?utm_source=repository-badge&amp;utm_medium=badge&amp;utm_campaign=badge-repository-82054" target="_blank" rel="noopener noreferrer"><img src="https://trendshift.io/api/badge/repositories/82054" alt="morluto%2Frea | Trendshift" width="250" height="55"/></a>

**[ვებსაიტი](https://rea.tools/ka/) · [გიდები](https://rea.tools/ka/guides/) · [შოუქეისები](https://rea.tools/ka/showcase/)**

[სწრაფი დაწყება](#სწრაფი-დაწყება) · [როგორ მუშაობს REA](#როგორ-მუშაობს-rea) · [რისი ანალიზი შეგიძლია](#რისი-ანალიზი-შეგიძლია) · [შოუქეისები](#შოუქეისები) · [ხშირი კითხვები](#ხშირი-კითხვები) · [დოკუმენტაცია](#დოკუმენტაცია)

<code>npx rea-agents setup</code>

<br />

<img src="../assets/rea-hopper-analysis.png" alt="REA იწყებს ანალიზის ხიდს Hopper-ში ნატიურ ბინარულ ფაილზე მუშაობისას" width="1200" />

<br /><br />

<table aria-label="REA community">
<tr>
<td align="center" width="360">
  <a href="https://discord.gg/GkcryMnJDM">
    <img src="../assets/discord.svg" height="42" alt="Discord" /><br />
    <strong>შემოუერთდი უკუინჟინერიის საზოგადოებას</strong>
  </a><br />
  <sub>Discord · კითხვა-პასუხი · Show and Tell</sub>
</td>
</tr>
</table>

<br />

</div>

---

ნახე აპლიკაციაში ფუნქცია, რომლის დანერგვაც შენს პროექტში გინდა? სთხოვე აგენტს, გამოიკვლიოს ის REA-ს მეშვეობით. მას შეუძლია აპლიკაციის შემოწმება საწყისი კოდის (source code) გარეშეც: ახსნას, როგორ მუშაობს კონკრეტული ფუნქციონალი, მოიყვანოს ტექნიკური მტკიცებულებები და ააგოს მსგავსი ვერსია შენი პროექტისთვის.

REA შენს აგენტს აკავშირებს ინსტრუმენტებთან native ბინარული ფაილების, JavaScript და Electron აპების, .NET ასემბლებისა და ვებსაიტების შესამოწმებლად. იგივე ინსტრუმენტების გამოყენება პირდაპირ ტერმინალშიც შეგიძლია. ანალიზი სრულდება სრულად ლოკალურად, ხოლო მიღებულ შედეგებში თითოეულ დასკვნას თან ახლავს შესაბამისი მტკიცებულებები და შეზღუდვები.

`setup` ბრძანება არეგისტრირებს REA-ს შენს აგენტზე და აყენებს შესაბამის workflow ინსტრუქციებს. native ანალიზი იყენებს Hopper-ის, Ghidra-ს ან IDA-ს არსებულ ინსტალაციას; ინსტალატორს ასევე შეუძლია Hopper-ის ავტომატურად დაყენება შენი თანხმობის შემდეგ. სტატიკურ JavaScript ანალიზს native ანალიზის ძრავა არ სჭირდება.

> **[ეწვიე REA-ს ვებსაიტს](https://rea.tools/ka/)** — იქ იპოვი setup ინსტრუქციებს, ილუსტრირებულ გიდებსა და რეალურ ქეისებს.

## სწრაფი დაწყება

### დააყენე აგენტი

Node.js-ისა და npm-ის დაყენების შემდეგ გაუშვი:

```bash
npx rea-agents setup
```

აირჩიე სასურველი აგენტები, გადახედე შემოთავაზებულ ცვლილებებს და დაადასტურე. Setup ამატებს REA-ს MCP სერვერსა და შესაბამის workflow ინსტრუქციებს (არსებული კონფიგურაციების სარეზერვო ასლების შექმნით). ამის შემდეგ თავიდან გაუშვი აგენტი.

Setup მხარს უჭერს Claude Code-ს, Codex-ს, Cursor-ს, Gemini CLI-ს, Grok Build-სა და
[სხვა აგენტებს](../installation.md#supported-agents). იხილე
[ინსტალაციისა და Setup-ის გიდი](../installation.md) პროვაიდერის კონფიგურაციისა და
ხელით MCP რეგისტრაციისთვის.

### ჰკითხე აგენტს

```text
გაიგე, როგორ მუშაობს ძებნა Notes აპში, მაჩვენე მტკიცებულებები და ააგე მსგავსი ფუნქცია ჩემი პროექტისთვის.
```

(ჩაანაცვლე Notes შენი სამიზნე აპლიკაციითა და იმ ფუნქციონალით, რომლის გამოკვლევაც გსურს).

### გამოიყენე ტერმინალი

შეამოწმე ამოღებული JavaScript/Electron აპლიკაციის დირექტორია ან ASAR ფაილი:

```bash
npx -y rea-agents@latest analyze-javascript-application /absolute/path/to/app --json
```

შედეგში იხილავ მოდულებს, იმპორტებს, Electron-ის საზღვრებსა და მათ მტკიცებულებებს.
ჩაანაცვლე გზა შენი სამიზნე ლოკაციით, მაგალითად `"D:/apps/example"` Windows-ზე.

რეგულარული გამოყენებისთვის `rea` ბრძანების გლობალურად დასაყენებლად:

```bash
npm install --global rea-agents
rea --help
```

native ანალიზისთვის ჯერ დააკონფიგურირე პროვაიდერი. იხილე
[CLI და Evidence გიდი](../cli.md) native ბრძანებების, პროვაიდერის არჩევის,
სნეპშოტებისა და სკრიპტების შესახებ.

### განაახლე REA

REA სწრაფად ვითარდება და ახალ რელიზებში ხშირად შედის მნიშვნელოვანი შეცდომების გამოსწორება (bug fixes). შეინარჩუნე ინსტალაცია განახლებულ მდგომარეობაში.

CLI-სთვის, რომელიც დაყენებულია `npm install --global`-ით ან `bun add --global`-ით:

```bash
rea update
```

შენიშვნა: Bun-ის გლობალური განახლება მოითხოვს Bun 1.2.17 ან უფრო ახალ ვერსიას. უფრო ძველი Bun-ის შემთხვევაში ჯერ განაახლე Bun, ხოლო შემდეგ გაუშვი `rea update`.

აგენტის რეგისტრაციებისა და skill-ების განახლებისთვის გაუშვი ის setup ბრძანება, რომელსაც update დაბეჭდავს.

თუ იყენებ `npx`-ს, განაახლე აგენტის setup ასე:

```bash
npx rea-agents@latest setup
```

გადახედე setup-ის ცვლილებებს და თავიდან გაუშვი აგენტი. ერთჯერადი CLI ბრძანებებისთვის
გამოიყენე `npx rea-agents@latest <ბრძანება>`, ხოლო Bun-ის შემთხვევაში —
`bunx rea-agents@latest`.

## როგორ მუშაობს REA

შენი აგენტი REA-ს MCP-ის მეშვეობით იძახებს სამიზნე ობიექტის შესამოწმებლად და შესაბამისი კოდის მისაღებად. REA აბრუნებს მიღებულ შედეგებს მტკიცებულებებთან ერთად. აგენტი იყენებს ამ მონაცემებს დამატებითი სიღრმისეული კითხვებისთვის, ქცევის დასაზუსტებლად ან იმპლემენტაციის კოდის დასაწერად და შესამოწმებლად. CLI ბრძანებები ზუსტად იგივე workflow-ებს ეფუძნება.

![REA-ს გამოკვლევის ნაკადი: შენი აგენტი ეკითხება ლოკალურ სამიზნეზე, REA ამოწმებს და მიადევნებს მას ანალიზის ხელსაწყოებით, ხოლო აგენტი დაბრუნებულ კოდს, მითითებებსა და უცნობებს იყენებს ასახსნელად, განსახორციელებლად და შესამოწმებლად.](../../website/public/assets/figures/rea-investigation-flow.svg)

[სრული ზომის ფიგურის გახსნა](../../website/public/assets/figures/rea-investigation-flow.svg).

<a id="current-status"></a>

## რისი ანალიზი შეგიძლია

REA მოითხოვს Node.js 22.x (>=22.19), 24.x (>=24.11) ან 26+ ვერსიას და npm-ს.
დამატებითი ინსტრუმენტები და ჰოსტის მხარდაჭერა დამოკიდებულია სამიზნე ობიექტზე:

| სამიზნე                     | რას აბრუნებს REA                                                                                    | მოთხოვნები და გიდი                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| native ბინარული ფაილები     | ფსევდოკოდი, ასემბლერი, სტრინგები, სიმბოლოები, გამოძახებები და მითითებები                            | Hopper, Ghidra ან IDA; [native ანალიზის გიდი](https://rea.tools/ka/guides/native/)                                                        |
| Offline ELF layout          | სექციები, სეგმენტები, ორიგინალი სიმბოლოები/რელოკაციები და სტატიკური mitigation კანდიდატები          | Caller-ის მიერ მოწოდებული pwntools Linux x64-ზე; [ბინარული დიაგნოსტიკა](../binary-diagnostics.md)                                         |
| Go ბინარული ფაილები         | ჩაშენებული კომპილატორის ვერსია, მოდულები, ჩანაცვლებები და build პარამეტრები                         | ჩაშენებული სტატიკური ELF/PE/thin Mach-O შემოწმება; Go-ს ინსტალაცია არ არის საჭირო                                                         |
| WASM artifact               | ვალიდაცია, სექციები, ზუსტი import/export WAT ფორმები და დეკოდირებული WAT                            | Caller-ის მიერ მოწოდებული WABT 1.0.42; `inspect_wasm_artifact`                                                                            |
| EVM bytecode                | Dispatch სელექტორები, ბაიტების ოფსეტები, გამოთვლილი არგუმენტები და mutability                       | ლოკალური raw/hex carrier Linux x64-ზე; [offline EVM გიდი](../evm-bytecode.md)                                                             |
| SQLite მონაცემთა ბაზები     | ცხრილები, სვეტები, ინდექსები, views, triggers და არჩეული ordinary-table სტრიქონები                  | ლოკალური database/WAL snapshot; Node.js 24.x >=24.15 ან 26+ native SQLite limits-ით                                                       |
| ჩაწერილი Linux crash-ები    | ნედლი შენიშვნები, ყველა ჩაწერილი thread-ის რეგისტრები/სიგნალები და ოფციონალური mapping კანდიდატები  | Caller-ის მიერ მოწოდებული pwntools Linux x64-ზე; ოფციონალურად GDB/pwndbg; [ჩაწერილი crash-ები](../recorded-crashes.md)                    |
| JavaScript / Electron       | მოდულები, იმპორტები, source map-ები, მარშრუტები, IPC და native add-on-ებთან კავშირები               | Node.js და npm; [აპლიკაციის ანალიზი](https://rea.tools/ka/guides/javascript/)                                                             |
| ვებსაიტები                  | გვერდის სტრუქტურა, სკრიპტები, ქსელური დაკვირვებები და მოთხოვნილი სკრინშოტები                        | Chrome-ის ოჯახის ბრაუზერი; [ბრაუზერის ანალიზი](https://rea.tools/ka/guides/browser/)                                                      |
| შენახული ქსელური ჩანაწერები | მოთხოვნები, პასუხები, ხელმისაწვდომი payload-ები და წყაროს მდებარეობები                              | HAR ან Fiddler Everywhere SAZ; mitmdump Linux-ზე native mitmproxy ჩანაწერებისთვის; [ქსელური ჩანაწერების გიდი](../web-network-captures.md) |
| .NET ასემბლები              | მეტამონაცემები, CIL ინსტრუქციები, დეკლარირებული native დამოკიდებულებები და build შედარებები         | არაფერი (მხოლოდ სტატიკური); [managed-code გიდი](../managed-code-analysis.md)                                                              |
| Android APK-ები             | Manifest დეკლარაციები, კლასები, დეკომპილირებული მეთოდები და მითითებები                              | Headless JADX და სრული JDK Linux/macOS/Windows x64-ზე; [Android გიდი](../android-analysis.md)                                             |
| Android მოწყობილობები       | მოწყობილობები, პაკეტები, პროცესები, ლოგები, dump-ები, ეკრანის გადაღებები და APK/ფაილის გადატანა     | Caller-ის მიერ მოწოდებული adb (ემულატორი ან აპარატი); [ADB გიდი](../adb-device-analysis.md)                                               |
| JEB პროექტები               | ძრავაზე დაფუძნებული პროექტის ერთეულები, artifact digest-ები და ტიპის/მეთოდის ფსევდოკოდი             | Caller-ის მიერ გაშვებული JEB კლიენტი MCP-ით (`REA_JEB_MCP_URL`); [JEB გიდი](../jeb-analysis.md)                                           |
| Android რესურსები           | დეკოდირებული manifest, სტრინგების ცხრილები, ლოკალები და ვერსიის ფაქტები                             | Caller-ის მიერ მოწოდებული Apktool launcher; [რესურსების გიდი](../apktool-resource-analysis.md)                                            |
| Flutter აპები               | Dart snapshot hash, per-ABI ბიბლიოთეკის digest-ები და ძრავის build provenance                       | არაფერი (სტატიკური APK პარსინგი); [Flutter გიდი](../flutter-analysis.md)                                                                  |
| Firmware                    | რეგიონები, ამოღების შედეგები და native ანალიზზე გადაცემა                                            | Binwalk / Unblob Linux-ზე; [firmware გიდი](../firmware-analysis.md)                                                                       |
| ჩაწერილი პაკეტები           | არჩეული ველები, გამეორებული მნიშვნელობები, ფილტრები და decode-as წესები                             | Linux: TShark 4.x + prlimit; [ჩაწერის გიდი](../packet-captures.md)                                                                        |
| პაკეტების შეჯამებები        | Endpoints, DNS, TLS SNI, პროტოკოლების განაწილება და HTTP მოთხოვნები                                 | Caller-ის მიერ მოწოდებული tshark და capinfos (Linux-ზე შემოწმებული); [pcap გიდი](../pcap-analysis.md)                                     |
| ჩაწერილი ლოგიკური სიგნალები | დეკოდერის ანოტაციები, ნიმუშების დიაპაზონები და დიაგნოსტიკა                                          | Linux: sigrok-cli 0.7.2 + prlimit; [სიგნალების ჩანაწერები](../signal-recordings.md)                                                       |
| პაკეტები და რესურსები       | ფაილების ინვენტარი, digest-ები, plist-ები, Apple bundle ანატომია და ამოღებული რესურსები             | [Artifact და JavaScript გიდი](../javascript-artifact-reconstruction.md), [Apple აპლიკაციები](../apple-application-analysis.md)            |
| პროცესის ქცევა              | ტერმინალის გამოსავალი, ინტერაქციები, გასვლისა და ფაილური სისტემის დაკვირვებები, გაშვების შედარებები | Linux/macOS native PTY-ით; [პროცესის ჩაწერა](../process-capture.md)                                                                       |

სტატიკური JavaScript და .NET შემოწმება კითხულობს მოწოდებულ ფაილებს აპლიკაციის გაშვების გარეშე. Runtime ჩაწერა გაუშვებს არჩეულ სამიზნეს შენი მომხმარებლის უფლებებით ან ურთიერთქმედებს მასთან; თითოეული runtime გიდი დეტალურად აღწერს შესაბამის ეფექტებს.

<a id="choosing-a-deep-analysis-provider"></a>

native ფორმატები და ჰოსტის მხარდაჭერა განსხვავდება პროვაიდერის მიხედვით. იხილე
[Hopper და Ghidra setup](../installation.md#hopper),
[IDA გიდი](../ida-provider.md) და
[ექსპერიმენტული Windows Ghidra მხარდაჭერა](../windows-ghidra-p0.md).
Ghidra ასევე მხარს უჭერს [16-ბიტიან DOS ანალიზს](../ghidra-dos.md).
დიდი ბინარული ფაილებისთვის გაზარდე პროვაიდერის startup ვადა
`REA_GHIDRA_STARTUP_TIMEOUT_MS` ან `REA_HOPPER_STARTUP_TIMEOUT_MS` პარამეტრებით.
პროვაიდერის არჩევისთვის იხილე [CLI გიდი](../cli.md#choose-a-provider).
შეამოწმე [რელიზის ხელმისაწვდომობა](../installation.md#released-package-and-main)
იმ ფუნქციებისთვის, რომლებიც ბოლო npm რელიზის შემდეგ დაემატა.

## შოუქეისები

[![DX-Ball sound-pan, Notion clipboard-bridge და TH04 bullet-ring შოუქეისების ილუსტრაციები](../assets/rea-showcases.png)](https://rea.tools/ka/showcase/)

### DX-Ball: sound-pan გამოთვლის რეკონსტრუქცია

მიჰყევი ხმის გამოძახებას პოზიცია–pan დამხმარე ფუნქციამდე, შეამოწმე ინსტრუქციები და გადაიყვანე არასრული ფსევდოკოდი C-ში. რეკონსტრუქცია წარმატებით გადის 3,205 ორიგინალ x86 ტესტ-ქეისს და ზუსტად ამრავლებს კომპილირებული ფუნქციის ყველა 63 ბაიტს.

[წაიკითხე ქეისი](https://rea.tools/ka/showcase/dx-ball/) ·
[რეკონსტრუქციის რეპოზიტორი](https://github.com/N0zoM1z0/dx-ball)

### Notion: Electron clipboard ხიდის კვალდაკვალ გაყოლა

იპოვე renderer-ის clipboard API, გაიარე preload და IPC მთავარ პროცესამდე და შეამოწმე მდიდარი clipboard ფორმატი.

[წაიკითხე ქეისი](https://rea.tools/ka/showcase/notion/)

### TH04: DOS bullet-ring გამოთვლის აღდგენა

შეამოწმე ორიგინალი PC-98 თამაშის 16-ბიტიანი ინსტრუქციები, აღადგინე ფიქსირებული და მიმართული კუთხის გამოთვლები და შეადარე რეკონსტრუირებული C++ ისტორიული კომპილატორის გამოსავალს.

[წაიკითხე ქეისი](https://rea.tools/ka/showcase/th04/) ·
[რეკონსტრუქციის რეპოზიტორი](https://github.com/N0zoM1z0/th04)

თუ REA-ს მეშვეობით რაიმე საინტერესო გამოიკვლიე, სიამოვნებით გაგვიზიარე! გახსენი
[Issue](https://github.com/morluto/rea/issues) ან
[Pull Request](https://github.com/morluto/rea/pulls) — მიუთითე სამიზნე ობიექტი,
შენი კითხვა, როგორ დაგეხმარა REA და რა აღმოაჩინე.

## ხშირი კითხვები

<details>
<summary><strong>რომელ აგენტებს შეუძლიათ REA-ს გამოყენება?</strong></summary>

ნებისმიერ აგენტს, რომელსაც აქვს ლოკალური MCP სერვერების მხარდაჭერა. Setup ავტომატურად აკონფიგურირებს
[მხარდაჭერილ აგენტებს](../installation.md#supported-agents); სხვა კლიენტებს შეუძლიათ ხელით გაიარონ
[MCP რეგისტრაცია](../installation.md#mcp-registry).

</details>

<details>
<summary><strong>მჭირდება Hopper, Ghidra ან IDA?</strong></summary>

ღრმა native ანალიზი იყენებს ერთ-ერთ მათგანს. სტატიკური JavaScript და .NET შემოწმება მუშაობს native ანალიზის ძრავის გარეშეც. Setup-ს შეუძლია Hopper-ის დაყენება შენი თანხმობის შემდეგ; Ghidra და IDA იყენებენ შენს არსებულ ინსტალაციებს. იხილე [პროვაიდერის setup](../installation.md#hopper).

</details>

<details>
<summary><strong>საჭიროა Hopper-ის წინასწარ გაშვება?</strong></summary>

REA Hopper-ს გაუშვებს მაშინ, როდესაც ოპერაციას დასჭირდება. macOS-ზე პირველი გაშვებისას შესაძლოა გამოჩნდეს დიალოგი დემო რეჟიმის არჩევის ან ლიცენზიის აქტივაციის შესახებ. დაასრულე ეს მოთხოვნა პირველ CLI/MCP ოპერაციამდე ან ავტომატიზებულ (unattended) სამუშაომდე. საჭიროების შემთხვევაში გახსენი Hopper ხელით. იხილე
[Hopper-ის გაშვება და პრობლემების მოგვარება](../installation.md#launcher-paths-and-troubleshooting).

</details>

<details>
<summary><strong>რას აკეთებს skill-ის დაყენება skills.sh-დან?</strong></summary>

Skill აგენტს აძლევს კვლევისთვის საჭირო ინსტრუქციებს. გამოიყენე `npx rea-agents setup`
REA-ს MCP სერვერის დასარეგისტრირებლად და შესაბამისი ინსტრუქციების დასაყენებლად, შემდეგ თავიდან გაუშვი აგენტი. იხილე
[მხარდაჭერილი ინსტრუქციები მხოლოდ skill-ის ინსტალაციისთვის](../installation.md#skill-only-installation).

</details>

<details>
<summary><strong>რა კოდს აბრუნებს REA?</strong></summary>

native ანალიზი აბრუნებს ფსევდოკოდს და ასემბლერს. JavaScript/Electron ანალიზი აღადგენს მოდულებსა და მათ კავშირებს. შენი აგენტი იყენებს ამ აღმოჩენებს იმპლემენტაციის დასაწერად და შესამოწმებლად. [შოუქეისები](#შოუქეისები) იძლევა კონკრეტულ მაგალითებს.

</details>

<details>
<summary><strong>ატვირთავს თუ არა REA ჩემს აპლიკაციას?</strong></summary>

REA სამიზნეებს აანალიზებს სრულად ლოკალურად. აგენტი იღებს ინსტრუმენტების შედეგებს, ხოლო მისი მოდელის პროვაიდერს აქვს საკუთარი მონაცემთა პოლიტიკა.

</details>

<details>
<summary><strong>რა გავაკეთო შეცდომის (error) წააწყდომისას?</strong></summary>

პირველ რიგში განაახლე REA; შესაძლოა ბოლო რელიზში პრობლემა უკვე გამოსწორებულია.

CLI-სთვის:

```bash
rea update
```

`npx` setup-ისთვის:

```bash
npx rea-agents@latest setup
```

თუ აგენტს იყენებ, დაასრულე [setup-ის განახლება](#განაახლე-rea) და თავიდან გაუშვი.
იგივე დავალება ხელახლა სცადე. თუ პრობლემა მაინც მეორდება, გახსენი
[Issue](https://github.com/morluto/rea/issues) REA-ს ვერსიის, სამიზნის ტიპის,
რეპროდუცირების ნაბიჯებისა და შეცდომის ლოგის მითითებით.

</details>

## დოკუმენტაცია

დაიწყე ვებსაიტის [პრაქტიკული გიდებით](https://rea.tools/ka/guides/).
ზუსტი პარამეტრების, წინაპირობებისა და შედეგის ფორმატებისთვის იხილე:

- [ინსტალაცია და Setup](../installation.md): აგენტის რეგისტრაცია, პროვაიდერის კონფიგურაცია, განახლებები და წაშლა (uninstall).
- [მზადყოფნა და პრობლემების მოგვარება](../installation.md#check-readiness-for-your-task): ცალკეული აგენტის ან ანალიზის ძრავის დიაგნოსტიკა.
- [CLI და Evidence](../cli.md): ბრძანებები, პროვაიდერის არჩევა, სნეპშოტები, import/export და გასვლის სტატუსები (exit codes).
- [MCP კონტრაქტები](../mcp-contracts.md) და [აგენტის პრომპტები](../mcp-prompts.md): ინსტრუმენტების შედეგები, სესიები და მიმართული გამოკვლევები.
- [ინსტრუმენტების კატალოგი](../mcp-contracts.md#generated-catalog): ინსტრუმენტების, პროვაიდერებისა და CLI ბრძანებების გენერირებული ინვენტარი.
- [გზამკვლევი (Roadmap)](../roadmap.md): დაგეგმილი სამუშაოები და შესაძლებლობების ტრეკერი.

უსაფრთხოების მოწყვლადობების შესახებ შეგვატყობინეთ [SECURITY.md](../../SECURITY.md)-ის მეშვეობით.

## ვარსკვლავების ისტორია

🎉 **200,000 GitHub ვარსკვლავი - დიდი მადლობა!**

მადლობა ყველას, ვინც იყენებს REA-ს, აფიქსირებს შეცდომებს, ითხოვს ახალ ფუნქციებს, ამოწმებს ბილდებს და წვლილი შეაქვს პროექტის განვითარებაში.

<a href="https://www.star-history.com/?repos=morluto%2Frea&amp;type=date">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=morluto/rea&amp;type=date&amp;theme=dark&amp;legend=top-left" />
    <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=morluto/rea&amp;type=date" />
    <img alt="REA GitHub star history" src="https://api.star-history.com/chart?repos=morluto/rea&amp;type=date" />
  </picture>
</a>

## Disclaimer

იხილე [DISCLAIMER.md](../../DISCLAIMER.md) პასუხისმგებლიანი გამოყენების სახელმძღვანელოსთვის.

პროექტის პოზიცია უკანონო ან არაავტორიზებულ გამოყენებაზე ვრცელდება REA-ს ყველა ვერსიაზე, გავრცელების არხსა და პლატფორმაზე; თითოეული ასლი ინარჩუნებს შესაბამის ლიცენზიას.

REA განკუთვნილია კანონიერი კვლევის, განათლების, თავსებადობის უზრუნველყოფის, პროგრამული უზრუნველყოფის მხარდაჭერისა და იმ პროგრამების ანალიზისთვის, რომლებიც გეკუთვნის ან რომელთა შემოწმების ოფიციალური უფლებაც გაქვს.

## წვლილის შეტანა

სიამოვნებით მივიღებთ შენს დახმარებას REA-ს განვითარებაში! გახსენი
[Issue](https://github.com/morluto/rea/issues) შეცდომის დასაფიქსირებლად ან ახალი ფუნქციის შესათავაზებლად,
ან გამოაგზავნე [Pull Request](https://github.com/morluto/rea/pulls) კოდისა და დოკუმენტაციის გასაუმჯობესებლად.

იხილე [CONTRIBUTING.md](../../CONTRIBUTING.md) დეველოპმენტის გარემოს გამართვისთვის,
[ტესტირების სექცია](../testing.md) ვერიფიკაციისთვის და
[არქიტექტურული რუკა](../architecture.mermaid) პროექტის სტრუქტურის გასაგებად.

## ლიცენზია

[MIT](../../LICENSE)

REA-ს ავტორული კოდი ვრცელდება MIT ლიცენზიით. მესამე მხარის მასალები ინარჩუნებს საკუთარ ლიცენზიებსა და საავტორო უფლებების აღნიშვნებს; იხილე
[მესამე მხარის შენიშვნები](../../THIRD_PARTY_NOTICES.md) დამოკიდებულებების ინვენტარის,
შენახული ლიცენზიის ტექსტებისა და გარე ინსტრუმენტების პირობების გასაცნობად.

კომერციული ინსტრუმენტები (მათ შორის IDA Pro / Hex-Rays დეკომპილატორები, Hopper და JEB) უნდა მოიპოვო და გამოიყენო კანონიერად, მათი შესაბამისი ლიცენზიების დაცვით. REA არ ანიჭებს ინსტრუმენტის ლიცენზიას, გასაღებს ან აქტივაციის უფლებას. საცდელი (trial) და დემო ვერსიები ექვემდებარება გამყიდველის პირობებს. გატეხილი ასლები, მოპარული გასაღებები და ლიცენზიის გვერდის ავლა დაუშვებელია. ეს სახელმძღვანელო არ ცვლის MIT ან მესამე მხარის ლიცენზიებს.
