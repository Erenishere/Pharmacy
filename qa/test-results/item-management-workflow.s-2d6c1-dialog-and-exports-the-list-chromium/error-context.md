# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: item-management-workflow.smoke.spec.js >> item management create and export workflow >> item management creates a new item through the dialog and exports the list
- Location: tests\item-management-workflow.smoke.spec.js:34:3

# Error details

```
Test timeout of 45000ms exceeded.
```

```
Error: locator.click: Test timeout of 45000ms exceeded.
Call log:
  - waiting for getByRole('option').first()

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - button [ref=e6] [cursor=pointer]:
        - img [ref=e7]: menu
      - generic [ref=e10]:
        - img [ref=e11]: search
        - textbox [ref=e12]:
          - /placeholder: Search items, customers, invoices...
      - generic [ref=e13]:
        - button [ref=e14] [cursor=pointer]:
          - img [ref=e15]:
            - text: notifications
            - generic: "3"
        - button [ref=e18]:
          - img [ref=e19]: expand_more
          - generic [ref=e20]:
            - img [ref=e22]: person
            - generic [ref=e23]:
              - generic [ref=e24]: smoke.admin
              - generic [ref=e25]: Admin
    - generic [ref=e28]:
      - generic [ref=e32]:
        - generic [ref=e34]:
          - img [ref=e36]: local_pharmacy
          - generic [ref=e37]: Industraders
        - navigation [ref=e38]:
          - link [ref=e39] [cursor=pointer]:
            - /url: /dashboard
            - img [ref=e40]: dashboard
            - generic [ref=e41]: Dashboard
          - generic [ref=e42]:
            - generic [ref=e43] [cursor=pointer]:
              - img [ref=e44]: inventory_2
              - generic [ref=e45]: Inventory
              - img [ref=e46]: chevron_right
            - generic [ref=e47]:
              - link [ref=e48] [cursor=pointer]:
                - /url: /items
                - img [ref=e49]: category
                - generic [ref=e50]: Items
              - link [ref=e51] [cursor=pointer]:
                - /url: /batches
                - img [ref=e52]: qr_code
                - generic [ref=e53]: Batches / Purchase
              - link [ref=e54] [cursor=pointer]:
                - /url: /inventory/stock-levels
                - img [ref=e55]: inventory
                - generic [ref=e56]: Stock Overview
              - link [ref=e57] [cursor=pointer]:
                - /url: /inventory/stock-adjustment
                - img [ref=e58]: tune
                - generic [ref=e59]: Stock Adjustment
              - link [ref=e60] [cursor=pointer]:
                - /url: /inventory/physical-count
                - img [ref=e61]: fact_check
                - generic [ref=e62]: Physical Count
          - generic [ref=e63]:
            - generic [ref=e64] [cursor=pointer]:
              - img [ref=e65]: warehouse
              - generic [ref=e66]: Warehouses
              - img [ref=e67]: chevron_right
            - link [ref=e68] [cursor=pointer]:
              - /url: /warehouses
              - img [ref=e69]: store
              - generic [ref=e70]: Manage Warehouses
            - link [ref=e71] [cursor=pointer]:
              - /url: /inventory/stock-transfer
              - img [ref=e72]: swap_horiz
              - generic [ref=e73]: Stock Transfer
          - generic [ref=e74]:
            - generic [ref=e75] [cursor=pointer]:
              - img [ref=e76]: point_of_sale
              - generic [ref=e77]: Sales
              - img [ref=e78]: chevron_right
            - link [ref=e79] [cursor=pointer]:
              - /url: /sales-invoices
              - img [ref=e80]: receipt
              - generic [ref=e81]: Sales List
            - link [ref=e82] [cursor=pointer]:
              - /url: /sales-returns
              - img [ref=e83]: assignment_return
              - generic [ref=e84]: Returns
          - generic [ref=e85]:
            - generic [ref=e86] [cursor=pointer]:
              - img [ref=e87]: shopping_bag
              - generic [ref=e88]: Purchase
              - img [ref=e89]: chevron_right
            - link [ref=e90] [cursor=pointer]:
              - /url: /purchase-invoices
              - img [ref=e91]: receipt_long
              - generic [ref=e92]: Purchase Invoices
            - link [ref=e93] [cursor=pointer]:
              - /url: /suppliers
              - img [ref=e94]: local_shipping
              - generic [ref=e95]: Suppliers
          - generic [ref=e96]:
            - generic [ref=e97] [cursor=pointer]:
              - img [ref=e98]: people
              - generic [ref=e99]: Users
              - img [ref=e100]: chevron_right
            - link [ref=e101] [cursor=pointer]:
              - /url: /users
              - img [ref=e102]: admin_panel_settings
              - generic [ref=e103]: User Management
            - link [ref=e104] [cursor=pointer]:
              - /url: /customers
              - img [ref=e105]: person
              - generic [ref=e106]: Customers
          - link [ref=e107] [cursor=pointer]:
            - /url: /master-data
            - img [ref=e108]: dataset
            - generic [ref=e109]: Master Data
          - generic [ref=e110]:
            - generic [ref=e111] [cursor=pointer]:
              - img [ref=e112]: account_balance
              - generic [ref=e113]: Accounts
              - img [ref=e114]: chevron_right
            - link [ref=e115] [cursor=pointer]:
              - /url: /accounts
              - img [ref=e116]: account_balance_wallet
              - generic [ref=e117]: Chart of Accounts
            - link [ref=e118] [cursor=pointer]:
              - /url: /account-registration
              - img [ref=e119]: person_add
              - generic [ref=e120]: Account Registration
          - generic [ref=e121]:
            - generic [ref=e122] [cursor=pointer]:
              - img [ref=e123]: account_balance_wallet
              - generic [ref=e124]: Expenses
              - img [ref=e125]: chevron_right
            - link [ref=e126] [cursor=pointer]:
              - /url: /expenses
              - img [ref=e127]: account_balance_wallet
              - generic [ref=e128]: Expenses
            - link [ref=e129] [cursor=pointer]:
              - /url: /investors
              - img [ref=e130]: savings
              - generic [ref=e131]: Investors
            - link [ref=e132] [cursor=pointer]:
              - /url: /investors/profit-share
              - img [ref=e133]: pie_chart
              - generic [ref=e134]: Profit Share
            - link [ref=e135] [cursor=pointer]:
              - /url: /tax-config
              - img [ref=e136]: receipt_long
              - generic [ref=e137]: Tax Config
            - link [ref=e138] [cursor=pointer]:
              - /url: /salary-packages
              - img [ref=e139]: payments
              - generic [ref=e140]: Salary Packages
            - link [ref=e141] [cursor=pointer]:
              - /url: /salary/calculate
              - img [ref=e142]: calculate
              - generic [ref=e143]: Calculate Salary
          - generic [ref=e144]:
            - generic [ref=e145] [cursor=pointer]:
              - img [ref=e146]: local_shipping
              - generic [ref=e147]: Operations
              - img [ref=e148]: chevron_right
            - link [ref=e149] [cursor=pointer]:
              - /url: /quotations
              - img [ref=e150]: request_quote
              - generic [ref=e151]: Quotations
            - link [ref=e152] [cursor=pointer]:
              - /url: /e-orders
              - img [ref=e153]: shopping_cart
              - generic [ref=e154]: E-Orders
            - link [ref=e155] [cursor=pointer]:
              - /url: /route-plans
              - img [ref=e156]: map
              - generic [ref=e157]: Route Plans
            - link [ref=e158] [cursor=pointer]:
              - /url: /bilty
              - img [ref=e159]: description
              - generic [ref=e160]: Bilty
            - link [ref=e161] [cursor=pointer]:
              - /url: /recovery-summary
              - img [ref=e162]: summarize
              - generic [ref=e163]: Recovery Summary
            - link [ref=e164] [cursor=pointer]:
              - /url: /targets/dashboard
              - img [ref=e165]: track_changes
              - generic [ref=e166]: Target Dashboard
            - link [ref=e167] [cursor=pointer]:
              - /url: /schemes
              - img [ref=e168]: percent
              - generic [ref=e169]: Schemes & Claims
            - link [ref=e170] [cursor=pointer]:
              - /url: /cashbook
              - img [ref=e171]: account_balance_wallet
              - generic [ref=e172]: Cash Book
            - link [ref=e173] [cursor=pointer]:
              - /url: /cash-adjustment
              - img [ref=e174]: swap_horiz
              - generic [ref=e175]: Cash Adjustment
            - link [ref=e176] [cursor=pointer]:
              - /url: /pdc
              - img [ref=e177]: account_balance
              - generic [ref=e178]: Post-Dated Cheques
            - link [ref=e179] [cursor=pointer]:
              - /url: /capital
              - img [ref=e180]: account_balance_wallet
              - generic [ref=e181]: Capital Assets
            - link [ref=e182] [cursor=pointer]:
              - /url: /letters
              - img [ref=e183]: mail
              - generic [ref=e184]: Letters
      - generic [ref=e188]:
        - generic [ref=e189]:
          - generic [ref=e190]:
            - heading [level=1] [ref=e192]:
              - img [ref=e193]: inventory_2
              - text: Item Management
            - paragraph [ref=e194]: Manage your inventory items, pricing, and stock levels
          - generic [ref=e195]:
            - button [ref=e196]:
              - img [ref=e197]: add
              - generic [ref=e198]: New Item
            - button [ref=e201]:
              - img [ref=e202]: file_download
              - generic [ref=e203]: Export
        - generic [ref=e206]:
          - generic [ref=e207]:
            - generic [ref=e208]:
              - generic [ref=e211]:
                - generic [ref=e212]: Search Inventory
                - textbox [ref=e214]:
                  - /placeholder: Search by name, code, barcode...
                - img [ref=e216]: search
              - generic [ref=e219] [cursor=pointer]:
                - generic [ref=e220]: Category
                - combobox [ref=e222]:
                  - generic [ref=e223]:
                    - generic [ref=e225]: All Categories
                    - img [ref=e228]
            - generic [ref=e230]:
              - generic [ref=e233] [cursor=pointer]:
                - generic [ref=e234]: Company
                - combobox [ref=e236]:
                  - generic [ref=e237]:
                    - generic [ref=e239]: All Companies
                    - img [ref=e242]
              - generic [ref=e245]:
                - generic [ref=e246] [cursor=pointer]:
                  - checkbox [ref=e248]
                  - generic:
                    - img
                - generic [ref=e249] [cursor=pointer]: Low Stock Only
          - generic [ref=e251]:
            - table [ref=e253]:
              - rowgroup [ref=e254]:
                - row [ref=e255]:
                  - columnheader [ref=e256]: S#
                  - columnheader [ref=e257]: Company
                  - columnheader [ref=e258]:
                    - button [ref=e259] [cursor=pointer]:
                      - generic [ref=e260]: Item Name
                  - columnheader [ref=e267]:
                    - button [ref=e268] [cursor=pointer]:
                      - generic [ref=e269]: Qty
                  - columnheader [ref=e276]:
                    - button [ref=e277] [cursor=pointer]:
                      - generic [ref=e278]: P.Price
                  - columnheader [ref=e285]: Total Cost
                  - columnheader [ref=e286]:
                    - button [ref=e287] [cursor=pointer]:
                      - generic [ref=e288]: Sale Rate
                  - columnheader [ref=e295]: Category
                  - columnheader [ref=e296]: Actions
              - rowgroup [ref=e297]:
                - row [ref=e298]:
                  - cell [ref=e299]: "1"
                  - cell [ref=e300]: abc
                  - cell [ref=e301]: QA API Fallback 1777309725341 (QAFB1777309725341)
                  - cell [ref=e302]: "50"
                  - cell [ref=e303]: PKR10
                  - cell [ref=e304]: PKR500
                  - cell [ref=e305]: PKR16
                  - cell [ref=e306]: QA Category 20260427170602
                  - cell [ref=e307]:
                    - button [ref=e309] [cursor=pointer]:
                      - img [ref=e310]: more_vert
                - row [ref=e313]:
                  - cell [ref=e314]: "2"
                  - cell [ref=e315]: abc
                  - cell [ref=e316]: QA Test Item 20260427171119 API Fallback (QAFB0427171119)
                  - cell [ref=e317]: "16"
                  - cell [ref=e318]: PKR10
                  - cell [ref=e319]: PKR160
                  - cell [ref=e320]: PKR16
                  - cell [ref=e321]: QA Category 20260427171119
                  - cell [ref=e322]:
                    - button [ref=e324] [cursor=pointer]:
                      - img [ref=e325]: more_vert
                - row [ref=e328]:
                  - cell [ref=e329]: "3"
                  - cell [ref=e330]: abc
                  - cell [ref=e331]: QA Test Item 20260427171321 API Fallback (QAFB0427171321)
                  - cell [ref=e332]: "50"
                  - cell [ref=e333]: PKR10
                  - cell [ref=e334]: PKR500
                  - cell [ref=e335]: PKR16
                  - cell [ref=e336]: QA Category 20260427171321
                  - cell [ref=e337]:
                    - button [ref=e339] [cursor=pointer]:
                      - img [ref=e340]: more_vert
                - row [ref=e343]:
                  - cell [ref=e344]: "4"
                  - cell [ref=e345]: abc
                  - cell [ref=e346]: QA Test Item 20260427171629 API Fallback (QAFB0427171629)
                  - cell [ref=e347]: "50"
                  - cell [ref=e348]: PKR10
                  - cell [ref=e349]: PKR500
                  - cell [ref=e350]: PKR16
                  - cell [ref=e351]: QA Category 20260427171629
                  - cell [ref=e352]:
                    - button [ref=e354] [cursor=pointer]:
                      - img [ref=e355]: more_vert
                - row [ref=e358]:
                  - cell [ref=e359]: "5"
                  - cell [ref=e360]: abc
                  - cell [ref=e361]: QA Test Item 20260427171812 API Fallback (QAFB0427171812)
                  - cell [ref=e362]: "50"
                  - cell [ref=e363]: PKR10
                  - cell [ref=e364]: PKR500
                  - cell [ref=e365]: PKR16
                  - cell [ref=e366]: QA Category 20260427171812
                  - cell [ref=e367]:
                    - button [ref=e369] [cursor=pointer]:
                      - img [ref=e370]: more_vert
                - row [ref=e373]:
                  - cell [ref=e374]: "6"
                  - cell [ref=e375]: Smoke Pharma Company
                  - cell [ref=e376]: Smoke Test Item (SMOKEITEM)
                  - cell [ref=e377]: "50"
                  - cell [ref=e378]: PKR80
                  - cell [ref=e379]: PKR4,000
                  - cell [ref=e380]: PKR125
                  - cell [ref=e381]: Smoke Category
                  - cell [ref=e382]:
                    - button [ref=e384] [cursor=pointer]:
                      - img [ref=e385]: more_vert
                - row [ref=e388]:
                  - cell [ref=e389]: "7"
                  - cell [ref=e390]: Smoke Pharma Company
                  - cell [ref=e391]: Smoke UI Item 263747 (SMKUI263747)
                  - cell [ref=e392]: "0"
                  - cell [ref=e393]: PKR125
                  - cell [ref=e394]: PKR0
                  - cell [ref=e395]: PKR160
                  - cell [ref=e396]: QA Category 20260427165823
                  - cell [ref=e397]:
                    - button [ref=e399] [cursor=pointer]:
                      - img [ref=e400]: more_vert
                - row [ref=e403]:
                  - cell [ref=e404]: "8"
                  - cell [ref=e405]: Smoke Pharma Company
                  - cell [ref=e406]: Smoke UI Item 572883 (SMKUI572883)
                  - cell [ref=e407]: "0"
                  - cell [ref=e408]: PKR125
                  - cell [ref=e409]: PKR0
                  - cell [ref=e410]: PKR160
                  - cell [ref=e411]: QA Category 20260427165823
                  - cell [ref=e412]:
                    - button [ref=e414] [cursor=pointer]:
                      - img [ref=e415]: more_vert
                - row [ref=e418]:
                  - cell [ref=e419]: "9"
                  - cell [ref=e420]: abc
                  - cell [ref=e421]: panadol (123)
                  - cell [ref=e422]: "102"
                  - cell [ref=e423]: PKR14
                  - cell [ref=e424]: PKR1,428
                  - cell [ref=e425]: PKR10
                  - cell [ref=e426]: QA Category 20260427170946
                  - cell [ref=e427]:
                    - button [ref=e429] [cursor=pointer]:
                      - img [ref=e430]: more_vert
            - group [ref=e433]:
              - generic [ref=e435]:
                - generic [ref=e436]:
                  - generic [ref=e437]: "Items per page:"
                  - combobox [ref=e442] [cursor=pointer]:
                    - generic [ref=e443]:
                      - generic [ref=e445]: "25"
                      - img [ref=e448]
                - generic [ref=e451]:
                  - generic [ref=e452]: 1 – 9 of 9
                  - button [disabled]:
                    - img
                  - button [disabled]:
                    - img
  - dialog [ref=e457]:
    - generic [ref=e461]:
      - generic [ref=e462]:
        - generic [ref=e463]:
          - img [ref=e464]: inventory_2
          - generic [ref=e465]:
            - heading "New Item Registration" [level=1] [ref=e466]
            - paragraph [ref=e467]: Create a product with clear identity, pricing, and stock controls.
        - button [ref=e468] [cursor=pointer]:
          - img [ref=e469]: close
      - generic [ref=e473]:
        - navigation "Item registration sections" [ref=e474]:
          - button "Catalog" [ref=e475]:
            - img [ref=e476]: inventory_2
            - generic [ref=e477]: Catalog
          - button "Pricing" [ref=e480]:
            - img [ref=e481]: payments
            - generic [ref=e482]: Pricing
          - button "Packaging" [ref=e485]:
            - img [ref=e486]: inventory
            - generic [ref=e487]: Packaging
          - button "Controls" [ref=e490]:
            - img [ref=e491]: tune
            - generic [ref=e492]: Controls
        - generic [ref=e495]:
          - generic [ref=e496]:
            - generic [ref=e497]:
              - generic [ref=e499]:
                - generic [ref=e500]: Step 1
                - heading "Catalog Profile" [level=3] [ref=e501]
                - paragraph [ref=e502]: "Start with the fields staff uses first: name, code, unit, quantity, and classification."
              - generic [ref=e503]:
                - generic [ref=e504]:
                  - generic [ref=e505]:
                    - heading "Basics" [level=4] [ref=e506]
                    - generic [ref=e507]: New item setup
                  - generic [ref=e508]:
                    - generic [ref=e511]:
                      - generic [ref=e512]:
                        - text: Item Code
                        - generic [ref=e513]: "*"
                      - textbox "Item Code" [ref=e515]:
                        - /placeholder: MED-001
                    - generic [ref=e518] [cursor=pointer]:
                      - generic [ref=e519]:
                        - text: Unit
                        - generic [ref=e520]: "*"
                      - combobox "Unit Piece" [ref=e522]:
                        - generic [ref=e523]:
                          - generic [ref=e525]: Piece
                          - img [ref=e528]
                    - generic [ref=e532]:
                      - generic [ref=e533]:
                        - text: Product Name
                        - generic [ref=e534]: "*"
                      - textbox "Product Name" [ref=e536]:
                        - /placeholder: e.g. Paracetamol 500mg
                    - generic [ref=e539]:
                      - generic [ref=e540]:
                        - text: Opening Qty
                        - generic [ref=e541]: "*"
                      - spinbutton "Opening Qty" [ref=e543]: "0"
                  - generic [ref=e544]:
                    - strong [ref=e545]: "Qty shown in list:"
                    - generic [ref=e546]: This opening quantity becomes the starting Qty shown in the item list.
                - generic [ref=e547]:
                  - generic [ref=e548]:
                    - heading "Classification" [level=4] [ref=e549]
                    - generic [ref=e550]: How this item is grouped
                  - generic [ref=e551]:
                    - generic [ref=e554] [cursor=pointer]:
                      - generic [ref=e555]:
                        - text: Company
                        - generic [ref=e556]: "*"
                      - combobox "Company" [active] [ref=e558]:
                        - img [ref=e564]
                    - generic [ref=e568] [cursor=pointer]:
                      - generic [ref=e569]:
                        - text: Category
                        - generic [ref=e570]: "*"
                      - combobox "Category" [ref=e572]:
                        - img [ref=e578]
                    - generic [ref=e582] [cursor=pointer]:
                      - generic [ref=e583]: Sub Category
                      - combobox "Sub Category" [ref=e585]:
                        - img [ref=e591]
                    - generic [ref=e595] [cursor=pointer]:
                      - generic [ref=e596]:
                        - text: Business Type
                        - generic [ref=e597]: "*"
                      - combobox "Business Type" [ref=e599]:
                        - img [ref=e605]
                    - generic [ref=e609] [cursor=pointer]:
                      - generic [ref=e610]: Selling Group
                      - combobox "Selling Group" [ref=e612]:
                        - img [ref=e618]
                    - generic [ref=e622] [cursor=pointer]:
                      - generic [ref=e623]: Main Supplier
                      - combobox "Main Supplier" [ref=e625]:
                        - img [ref=e631]
                    - generic [ref=e635] [cursor=pointer]:
                      - generic [ref=e636]: Medicine Formula
                      - combobox "Medicine Formula" [ref=e638]:
                        - img [ref=e644]
                    - generic [ref=e648] [cursor=pointer]:
                      - generic [ref=e649]: Formula Size
                      - combobox "Formula Size" [ref=e651]:
                        - img [ref=e657]
            - generic [ref=e659]:
              - generic [ref=e661]:
                - generic [ref=e662]: Step 2
                - heading "Pricing Matrix" [level=3] [ref=e663]
                - paragraph [ref=e664]: Compare all pack-level rates in one aligned table instead of separate stacked cards.
              - generic [ref=e665]:
                - generic [ref=e666]:
                  - generic [ref=e667]: Pack Level
                  - generic [ref=e668]: Purchase
                  - generic [ref=e669]: Sale
                  - generic [ref=e670]: Retail
                - generic [ref=e671]:
                  - generic [ref=e672]:
                    - strong [ref=e673]: Unit
                    - generic [ref=e674]: Single sale piece
                  - generic [ref=e677]:
                    - generic [ref=e678]:
                      - text: Purchase
                      - generic [ref=e679]: "*"
                    - generic [ref=e680]: Rs
                    - spinbutton "Purchase" [ref=e682]: "0"
                  - generic [ref=e685]:
                    - generic [ref=e686]:
                      - text: Sale
                      - generic [ref=e687]: "*"
                    - generic [ref=e688]: Rs
                    - spinbutton "Sale" [ref=e690]: "0"
                  - generic [ref=e693]:
                    - generic [ref=e694]:
                      - text: Retail
                      - generic [ref=e695]: "*"
                    - generic [ref=e696]: Rs
                    - spinbutton "Retail" [ref=e698]: "0"
                - generic [ref=e699]:
                  - generic [ref=e700]:
                    - strong [ref=e701]: Box
                    - generic [ref=e702]: Bundle or box pricing
                  - generic [ref=e705]:
                    - generic [ref=e706]: Purchase
                    - generic [ref=e707]: Rs
                    - spinbutton "Purchase" [ref=e709]: "0"
                  - generic [ref=e712]:
                    - generic [ref=e713]: Sale
                    - generic [ref=e714]: Rs
                    - spinbutton "Sale" [ref=e716]: "0"
                  - generic [ref=e719]:
                    - generic [ref=e720]: Retail
                    - generic [ref=e721]: Rs
                    - spinbutton "Retail" [ref=e723]: "0"
                - generic [ref=e724]:
                  - generic [ref=e725]:
                    - strong [ref=e726]: Carton
                    - generic [ref=e727]: Full carton pricing
                  - generic [ref=e730]:
                    - generic [ref=e731]: Purchase
                    - generic [ref=e732]: Rs
                    - spinbutton "Purchase" [ref=e734]: "0"
                  - generic [ref=e737]:
                    - generic [ref=e738]: Sale
                    - generic [ref=e739]: Rs
                    - spinbutton "Sale" [ref=e741]: "0"
                  - generic [ref=e742]:
                    - generic [ref=e743]: Retail not used
                    - generic [ref=e744]: Carton MRP is usually managed from unit or box rates.
            - generic [ref=e746]:
              - generic [ref=e747]:
                - generic [ref=e748]:
                  - generic [ref=e749]:
                    - generic [ref=e750]: Step 3
                    - heading "Packaging" [level=4] [ref=e751]
                  - generic [ref=e752]: Conversion and carton detail
                - generic [ref=e753]:
                  - generic [ref=e756]:
                    - generic [ref=e757]:
                      - text: Units/Carton
                      - generic [ref=e758]: "*"
                    - spinbutton "Units/Carton" [ref=e760]: "1"
                  - generic [ref=e763]:
                    - generic [ref=e764]:
                      - text: Units/Box
                      - generic [ref=e765]: "*"
                    - spinbutton "Units/Box" [ref=e767]: "1"
                  - generic [ref=e770]:
                    - generic [ref=e771]:
                      - text: Boxes/Carton
                      - generic [ref=e772]: "*"
                    - spinbutton "Boxes/Carton" [ref=e774]: "1"
                - generic [ref=e775]:
                  - generic [ref=e778]:
                    - generic [ref=e779]: Carton L (cm)
                    - spinbutton "Carton L (cm)" [ref=e781]: "0"
                  - generic [ref=e784]:
                    - generic [ref=e785]: Carton W (cm)
                    - spinbutton "Carton W (cm)" [ref=e787]: "0"
                  - generic [ref=e790]:
                    - generic [ref=e791]: Carton H (cm)
                    - spinbutton "Carton H (cm)" [ref=e793]: "0"
                - generic [ref=e794]:
                  - generic [ref=e797]:
                    - generic [ref=e798]: Unit Wt (kg)
                    - spinbutton "Unit Wt (kg)" [ref=e800]: "0"
                  - generic [ref=e803]:
                    - generic [ref=e804]: Box Wt (kg)
                    - spinbutton "Box Wt (kg)" [ref=e806]: "0"
                  - generic [ref=e809]:
                    - generic [ref=e810]: Carton Wt (kg)
                    - spinbutton "Carton Wt (kg)" [ref=e812]: "0"
              - generic [ref=e813]:
                - generic [ref=e814]:
                  - generic [ref=e815]:
                    - generic [ref=e816]: Step 4
                    - heading "Tax & Charges" [level=4] [ref=e817]
                  - generic [ref=e818]: Commercial values applied on sale
                - generic [ref=e819]:
                  - generic [ref=e822] [cursor=pointer]:
                    - generic [ref=e823]: GST (Filer)
                    - combobox "GST (Filer) 0%" [ref=e825]:
                      - generic [ref=e826]:
                        - generic [ref=e828]: 0%
                        - img [ref=e831]
                  - generic [ref=e835] [cursor=pointer]:
                    - generic [ref=e836]: GST (Non-Filer)
                    - combobox "GST (Non-Filer) 0%" [ref=e838]:
                      - generic [ref=e839]:
                        - generic [ref=e841]: 0%
                        - img [ref=e844]
                  - generic [ref=e848]:
                    - generic [ref=e849]: Surcharge/Unit
                    - generic [ref=e850]: Rs
                    - spinbutton "Surcharge/Unit" [ref=e852]: "0"
          - complementary [ref=e853]:
            - generic [ref=e854]:
              - generic [ref=e855]:
                - generic [ref=e856]: Item Snapshot
                - generic [ref=e857]: Active
              - heading "New Item" [level=3] [ref=e858]
              - paragraph [ref=e859]: Code will appear here once entered.
              - generic [ref=e860]:
                - generic [ref=e861]:
                  - generic [ref=e862]: Opening Qty
                  - strong [ref=e863]: "0"
                - generic [ref=e864]:
                  - generic [ref=e865]: Unit
                  - strong [ref=e866]: piece
                - generic [ref=e867]:
                  - generic [ref=e868]: Supplier
                  - strong [ref=e869]: Pending
            - generic [ref=e870]:
              - generic [ref=e871]:
                - generic [ref=e872]:
                  - generic [ref=e873]: Inventory Controls
                  - heading "Stock Rules" [level=4] [ref=e874]
                - generic [ref=e876]:
                  - generic [ref=e877] [cursor=pointer]:
                    - checkbox "Active" [checked] [ref=e879]
                    - generic:
                      - img
                  - generic [ref=e880] [cursor=pointer]: Active
              - generic [ref=e881]:
                - generic [ref=e884]:
                  - generic [ref=e885]:
                    - text: Min Stock
                    - generic [ref=e886]: "*"
                  - spinbutton "Min Stock" [ref=e888]: "10"
                - generic [ref=e891]:
                  - generic [ref=e892]:
                    - text: Max Stock
                    - generic [ref=e893]: "*"
                  - spinbutton "Max Stock" [ref=e895]: "1000"
                - generic [ref=e898]:
                  - generic [ref=e899]: Alert Days
                  - spinbutton "Alert Days" [ref=e901]: "30"
            - generic [ref=e902]:
              - generic [ref=e903]:
                - generic [ref=e904]:
                  - generic [ref=e905]: Barcode
                  - heading "Identification" [level=4] [ref=e906]
                - button "Generate" [ref=e907]:
                  - img [ref=e908]: refresh
                  - generic [ref=e909]: Generate
              - generic [ref=e913]:
                - generic [ref=e914] [cursor=pointer]:
                  - checkbox "Auto-Generate Barcode" [ref=e916]
                  - generic:
                    - img
                - generic [ref=e917] [cursor=pointer]: Auto-Generate Barcode
              - generic [ref=e920]:
                - generic [ref=e921]: Barcode
                - textbox "Barcode" [ref=e923]:
                  - /placeholder: Scan or type
                - img [ref=e925]: barcode_scanner
            - generic [ref=e926]:
              - generic [ref=e927]: Image
              - heading "Product Photo" [level=4] [ref=e928]
              - generic [ref=e930] [cursor=pointer]:
                - img [ref=e931]: add_photo_alternate
                - generic [ref=e932]: Upload Image
                - generic [ref=e933]: JPG, PNG or WEBP
            - generic [ref=e934]:
              - generic [ref=e935]: Calculated View
              - heading "Price Summary" [level=4] [ref=e936]
              - generic [ref=e937]:
                - generic [ref=e938]:
                  - generic [ref=e939]: Net Landing
                  - strong [ref=e940]: Rs 0.00
                - generic [ref=e941]:
                  - generic [ref=e942]: Net Sale
                  - strong [ref=e943]: Rs 0.00
                - generic [ref=e944]:
                  - generic [ref=e945]: MRP + Tax
                  - strong [ref=e946]: Rs 0.00
      - generic [ref=e947]:
        - button "Discard" [ref=e948]:
          - generic [ref=e949]: Discard
        - button "Save" [ref=e952]:
          - img [ref=e953]: check_circle
          - generic [ref=e954]: Save
```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | const { loginAsSmokeAdmin } = require('./support/auth');
  3   | const fs = require('fs');
  4   | 
  5   | async function selectMatOption(page, selector, optionPattern) {
  6   |   await page.locator(selector).click();
  7   |   await page.getByRole('option', { name: optionPattern }).click();
  8   | }
  9   | 
  10  | async function selectFirstMatOption(page, selector) {
  11  |   await page.locator(selector).click();
> 12  |   await page.getByRole('option').first().click();
      |                                          ^ Error: locator.click: Test timeout of 45000ms exceeded.
  13  | }
  14  | 
  15  | async function trySelectMatOption(page, selector, optionPattern) {
  16  |   const field = page.locator(selector);
  17  |   await field.click();
  18  |   const option = page.getByRole('option', { name: optionPattern });
  19  |   const optionCount = await option.count().catch(() => 0);
  20  |   if (optionCount > 0) {
  21  |     await option.first().click();
  22  |     return true;
  23  |   }
  24  | 
  25  |   await page.keyboard.press('Escape').catch(() => {});
  26  |   return false;
  27  | }
  28  | 
  29  | test.describe('item management create and export workflow', () => {
  30  |   test.beforeEach(async ({ page }) => {
  31  |     await loginAsSmokeAdmin(page);
  32  |   });
  33  | 
  34  |   test('item management creates a new item through the dialog and exports the list', async ({ page }) => {
  35  |     const uniqueSuffix = Date.now().toString().slice(-6);
  36  |     const itemCode = `SMKUI${uniqueSuffix}`;
  37  |     const itemName = `Smoke UI Item ${uniqueSuffix}`;
  38  | 
  39  |     await page.goto('/items');
  40  |     await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
  41  | 
  42  |     await expect(page.locator('body')).toContainText('Item Management');
  43  |     await page.getByRole('button', { name: /new item/i }).click();
  44  | 
  45  |     const dialog = page.locator('mat-dialog-container');
  46  |     await expect(dialog).toContainText('New Item Registration');
  47  |     await expect(dialog).toContainText('Classification');
  48  |     await expect(dialog).toContainText('Pricing');
  49  |     await expect(dialog).toContainText('Catalog Profile');
  50  |     await expect(dialog).toContainText('Tax & Charges');
  51  |     await expect(dialog).toContainText('Packaging');
  52  |     await expect(dialog).toContainText('Inventory Controls');
  53  | 
  54  |     await selectFirstMatOption(page, 'mat-select[formcontrolname="companyId"]');
  55  |     await selectFirstMatOption(page, 'mat-select[formcontrolname="categoryId"]');
  56  |     await selectFirstMatOption(page, 'mat-select[formcontrolname="businessTypeId"]');
  57  |     await selectMatOption(page, 'mat-select[formcontrolname="sellingGroup"]', /^A$/i);
  58  |     await trySelectMatOption(page, 'mat-select[formcontrolname="formulaId"]', /Smoke Formula/i);
  59  |     await trySelectMatOption(page, 'mat-select[formcontrolname="subCategoryId"]', /Smoke Sub Category/i);
  60  |     await trySelectMatOption(page, 'mat-select[formcontrolname="formulaSizeId"]', /250mg/i);
  61  | 
  62  |     await dialog.locator('input[formcontrolname="unitPurchaseTP"]').fill('125');
  63  |     await dialog.locator('input[formcontrolname="unitSaleTP"]').fill('145');
  64  |     await dialog.locator('input[formcontrolname="unitRetailPrice"]').fill('160');
  65  |     await dialog.locator('input[formcontrolname="boxPurchaseTP"]').fill('1200');
  66  |     await dialog.locator('input[formcontrolname="boxSaleTP"]').fill('1350');
  67  |     await dialog.locator('input[formcontrolname="boxRetailPrice"]').fill('1500');
  68  |     await dialog.locator('input[formcontrolname="cartonPurchaseTP"]').fill('4800');
  69  |     await dialog.locator('input[formcontrolname="cartonSaleTP"]').fill('5200');
  70  | 
  71  |     await dialog.locator('input[formcontrolname="code"]').fill(itemCode);
  72  |     await dialog.locator('input[formcontrolname="name"]').fill(itemName);
  73  |     await selectMatOption(page, 'mat-select[formcontrolname="unit"]', /Piece/i);
  74  | 
  75  |     await selectMatOption(page, 'mat-select[formcontrolname="gstFiler"]', /^18%$/i);
  76  |     await selectMatOption(page, 'mat-select[formcontrolname="gstNonFiler"]', /^4%$/i);
  77  |     await dialog.locator('input[formcontrolname="goodsChargesPerUnit"]').fill('3');
  78  | 
  79  |     await dialog.locator('input[formcontrolname="unitsInCarton"]').fill('48');
  80  |     await dialog.locator('input[formcontrolname="unitsInBox"]').fill('12');
  81  |     await dialog.locator('input[formcontrolname="boxesInCarton"]').fill('4');
  82  |     await dialog.locator('input[formcontrolname="cartonLength"]').fill('22');
  83  |     await dialog.locator('input[formcontrolname="cartonWidth"]').fill('18');
  84  |     await dialog.locator('input[formcontrolname="cartonHeight"]').fill('16');
  85  |     await dialog.locator('input[formcontrolname="unitWeight"]').fill('0.15');
  86  |     await dialog.locator('input[formcontrolname="boxWeight"]').fill('1.8');
  87  |     await dialog.locator('input[formcontrolname="cartonWeight"]').fill('7.2');
  88  | 
  89  |     await dialog.locator('input[formcontrolname="minimumStock"]').fill('15');
  90  |     await dialog.locator('input[formcontrolname="maximumStock"]').fill('300');
  91  |     await dialog.locator('input[formcontrolname="noSalesAlertDays"]').fill('45');
  92  |     await dialog.getByRole('button', { name: /generate/i }).click();
  93  |     await expect(dialog.locator('.barcode-display')).not.toHaveText('');
  94  | 
  95  |     await dialog.getByRole('button', { name: /^save$/i }).click();
  96  |     await expect(dialog).toBeHidden({ timeout: 20_000 });
  97  | 
  98  |     const searchInput = page.getByPlaceholder(/search by name, code, barcode/i);
  99  |     await searchInput.fill(itemCode);
  100 | 
  101 |     const row = page.getByRole('row').filter({ hasText: itemCode }).first();
  102 |     await expect(row).toBeVisible({ timeout: 20_000 });
  103 |     await expect(row).toContainText(itemName);
  104 | 
  105 |     const downloadPromise = page.waitForEvent('download');
  106 |     await page.getByRole('button', { name: /export/i }).click();
  107 |     const download = await downloadPromise;
  108 | 
  109 |     expect(download.suggestedFilename()).toMatch(/^items_\d{4}-\d{2}-\d{2}\.xlsx$/);
  110 |     const filePath = await download.path();
  111 |     expect(fs.statSync(filePath).size).toBeGreaterThan(0);
  112 |   });
```