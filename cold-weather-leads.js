// Merge cold-weather state leads into all-targets.json
// All assigned to Danielle
const fs = require('fs');
const path = require('path');

const COLD_LEADS = [
  // PORTLAND, OR
  {name:"Heart Coffee Roasters",category:"Independent Coffee Shop",address:"2211 E Burnside St, Portland, OR 97214",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Coava Coffee Roasters",category:"Independent Coffee Shop",address:"1300 SE Grand Ave, Portland, OR 97214",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Stumptown Coffee (Portland)",category:"Independent Coffee Shop",address:"128 SW 3rd Ave, Portland, OR 97204",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"New Seasons Market (SE)",category:"Health Food Store",address:"1954 SE Division St, Portland, OR 97202",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"People's Food Co-op",category:"Health Food Store",address:"3029 SE 21st Ave, Portland, OR 97202",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Food Fight! Grocery",category:"Health Food Store",address:"1217 SE Stark St, Portland, OR 97214",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Gartner's Meats",category:"Butcher Shop",address:"7450 NE Killingsworth St, Portland, OR 97218",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Olympia Provisions",category:"Specialty Food Shop",address:"107 SE Washington St, Portland, OR 97214",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Screen Door",category:"Breakfast & Brunch Restaurant",address:"2337 E Burnside St, Portland, OR 97214",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Broder Nord",category:"Breakfast & Brunch Restaurant",address:"2240 N Interstate Ave, Portland, OR 97227",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Yoga Union Community Wellness",category:"Yoga Studio",address:"2305 SE 50th Ave, Portland, OR 97215",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"The Sudra",category:"Farm-to-Table Restaurant",address:"2031 NE Alberta St, Portland, OR 97211",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Providore Fine Foods",category:"Gourmet Food Shop",address:"2340 NE Sandy Blvd, Portland, OR 97232",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Kachka",category:"Farm-to-Table Restaurant",address:"720 SE Grand Ave, Portland, OR 97214",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},
  {name:"Proud Mary Coffee",category:"Independent Coffee Shop",address:"2012 NE Alberta St, Portland, OR 97211",neighborhood:"Portland",city:"Portland",state:"OR",borough:"Oregon"},

  // SEATTLE, WA
  {name:"Victrola Coffee Roasters",category:"Independent Coffee Shop",address:"310 E Pike St, Seattle, WA 98122",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"Elm Coffee Roasters",category:"Independent Coffee Shop",address:"240 2nd Ave S, Seattle, WA 98104",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"PCC Community Markets (Capitol Hill)",category:"Health Food Store",address:"1600 E Madison St, Seattle, WA 98122",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"Central Co-op",category:"Health Food Store",address:"1600 E Madison St, Seattle, WA 98122",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"DeLaurenti Food & Wine",category:"Specialty Food Shop",address:"1435 1st Ave, Seattle, WA 98101",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"Beecher's Handmade Cheese",category:"Specialty Food Shop",address:"1600 Pike Pl, Seattle, WA 98101",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"Portage Bay Cafe",category:"Breakfast & Brunch Restaurant",address:"391 Terry Ave N, Seattle, WA 98109",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"London Plane",category:"Farm-to-Table Restaurant",address:"300 Occidental Ave S, Seattle, WA 98104",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"8 Limbs Yoga Centers",category:"Yoga Studio",address:"500 E Pike St, Seattle, WA 98122",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"Vif Wine + Coffee",category:"Independent Coffee Shop",address:"4401 Fremont Ave N, Seattle, WA 98103",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"Rain Shadow Meats",category:"Butcher Shop",address:"404 Occidental Ave S, Seattle, WA 98104",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"Milstead & Co.",category:"Independent Coffee Shop",address:"754 N 34th St, Seattle, WA 98103",neighborhood:"Seattle",city:"Seattle",state:"WA",borough:"Washington"},
  {name:"The Herbfarm",category:"Farm-to-Table Restaurant",address:"14590 NE 145th St, Woodinville, WA 98072",neighborhood:"Seattle area",city:"Woodinville",state:"WA",borough:"Washington"},

  // DENVER / BOULDER, CO
  {name:"Huckleberry Roasters",category:"Independent Coffee Shop",address:"4301 N Pecos St, Denver, CO 80211",neighborhood:"Denver",city:"Denver",state:"CO",borough:"Colorado"},
  {name:"Sweet Bloom Coffee Roasters",category:"Independent Coffee Shop",address:"1619 Platte St #150, Denver, CO 80202",neighborhood:"Denver",city:"Denver",state:"CO",borough:"Colorado"},
  {name:"Natural Grocers (Capitol Hill)",category:"Health Food Store",address:"1535 E Colfax Ave, Denver, CO 80218",neighborhood:"Denver",city:"Denver",state:"CO",borough:"Colorado"},
  {name:"Nooch Vegan Market",category:"Health Food Store",address:"10 E Ellsworth Ave, Denver, CO 80209",neighborhood:"Denver",city:"Denver",state:"CO",borough:"Colorado"},
  {name:"Western Daughters Butcher Shoppe",category:"Butcher Shop",address:"3326 Tejon St, Denver, CO 80211",neighborhood:"Denver",city:"Denver",state:"CO",borough:"Colorado"},
  {name:"Snooze an AM Eatery",category:"Breakfast & Brunch Restaurant",address:"2262 Larimer St, Denver, CO 80205",neighborhood:"Denver",city:"Denver",state:"CO",borough:"Colorado"},
  {name:"The Lobby (Boulder)",category:"Independent Coffee Shop",address:"946 Pearl St, Boulder, CO 80302",neighborhood:"Boulder",city:"Boulder",state:"CO",borough:"Colorado"},
  {name:"Lucky's Market (Boulder)",category:"Health Food Store",address:"3970 Broadway, Boulder, CO 80304",neighborhood:"Boulder",city:"Boulder",state:"CO",borough:"Colorado"},
  {name:"Blackbelly Market",category:"Butcher Shop",address:"1606 Conestoga St, Boulder, CO 80301",neighborhood:"Boulder",city:"Boulder",state:"CO",borough:"Colorado"},
  {name:"The Kitchen (Boulder)",category:"Farm-to-Table Restaurant",address:"1039 Pearl St, Boulder, CO 80302",neighborhood:"Boulder",city:"Boulder",state:"CO",borough:"Colorado"},

  // MINNEAPOLIS, MN
  {name:"Spyhouse Coffee",category:"Independent Coffee Shop",address:"945 Broadway St NE, Minneapolis, MN 55413",neighborhood:"Minneapolis",city:"Minneapolis",state:"MN",borough:"Minnesota"},
  {name:"Dogwood Coffee",category:"Independent Coffee Shop",address:"3001 Hennepin Ave, Minneapolis, MN 55408",neighborhood:"Minneapolis",city:"Minneapolis",state:"MN",borough:"Minnesota"},
  {name:"Linden Hills Co-op",category:"Health Food Store",address:"2813 W 43rd St, Minneapolis, MN 55410",neighborhood:"Minneapolis",city:"Minneapolis",state:"MN",borough:"Minnesota"},
  {name:"The Wedge Community Co-op",category:"Health Food Store",address:"2105 Lyndale Ave S, Minneapolis, MN 55405",neighborhood:"Minneapolis",city:"Minneapolis",state:"MN",borough:"Minnesota"},
  {name:"Clancey's Meats & Fish",category:"Butcher Shop",address:"4307 Upton Ave S, Minneapolis, MN 55410",neighborhood:"Minneapolis",city:"Minneapolis",state:"MN",borough:"Minnesota"},
  {name:"Birchwood Cafe",category:"Farm-to-Table Restaurant",address:"3311 E 25th St, Minneapolis, MN 55406",neighborhood:"Minneapolis",city:"Minneapolis",state:"MN",borough:"Minnesota"},
  {name:"The Bachelor Farmer",category:"Farm-to-Table Restaurant",address:"50 N 2nd Ave, Minneapolis, MN 55401",neighborhood:"Minneapolis",city:"Minneapolis",state:"MN",borough:"Minnesota"},
  {name:"Patisserie 46",category:"Bakery with Cafe Seating",address:"4552 Grand Ave S, Minneapolis, MN 55419",neighborhood:"Minneapolis",city:"Minneapolis",state:"MN",borough:"Minnesota"},

  // ANN ARBOR / DETROIT, MI
  {name:"Roos Roast Coffee",category:"Independent Coffee Shop",address:"1155 Rosewood St, Ann Arbor, MI 48104",neighborhood:"Ann Arbor",city:"Ann Arbor",state:"MI",borough:"Michigan"},
  {name:"Zingerman's Delicatessen",category:"Gourmet Food Shop",address:"422 Detroit St, Ann Arbor, MI 48104",neighborhood:"Ann Arbor",city:"Ann Arbor",state:"MI",borough:"Michigan"},
  {name:"Zingerman's Creamery",category:"Specialty Food Shop",address:"3723 Plaza Dr, Ann Arbor, MI 48108",neighborhood:"Ann Arbor",city:"Ann Arbor",state:"MI",borough:"Michigan"},
  {name:"People's Food Co-op (Ann Arbor)",category:"Health Food Store",address:"216 N 4th Ave, Ann Arbor, MI 48104",neighborhood:"Ann Arbor",city:"Ann Arbor",state:"MI",borough:"Michigan"},
  {name:"Avalon International Breads",category:"Bakery with Cafe Seating",address:"422 W Willis St, Detroit, MI 48201",neighborhood:"Detroit",city:"Detroit",state:"MI",borough:"Michigan"},
  {name:"Anthology Coffee",category:"Independent Coffee Shop",address:"200 E Nine Mile Rd, Ferndale, MI 48220",neighborhood:"Detroit area",city:"Ferndale",state:"MI",borough:"Michigan"},
  {name:"Marrow Detroit",category:"Butcher Shop",address:"8044 Michigan Ave, Detroit, MI 48210",neighborhood:"Detroit",city:"Detroit",state:"MI",borough:"Michigan"},
  {name:"Selden Standard",category:"Farm-to-Table Restaurant",address:"3921 2nd Ave, Detroit, MI 48201",neighborhood:"Detroit",city:"Detroit",state:"MI",borough:"Michigan"},
  {name:"The Farmer's Hand",category:"Health Food Store",address:"1701 Trumbull Ave, Detroit, MI 48216",neighborhood:"Detroit",city:"Detroit",state:"MI",borough:"Michigan"},

  // BURLINGTON, VT
  {name:"Muddy Waters",category:"Independent Coffee Shop",address:"184 Main St, Burlington, VT 05401",neighborhood:"Burlington",city:"Burlington",state:"VT",borough:"Vermont"},
  {name:"City Market / Onion River Co-op",category:"Health Food Store",address:"82 S Winooski Ave, Burlington, VT 05401",neighborhood:"Burlington",city:"Burlington",state:"VT",borough:"Vermont"},
  {name:"Healthy Living Market",category:"Health Food Store",address:"222 Dorset St, South Burlington, VT 05403",neighborhood:"Burlington",city:"South Burlington",state:"VT",borough:"Vermont"},
  {name:"Hen of the Wood",category:"Farm-to-Table Restaurant",address:"55 Cherry St, Burlington, VT 05401",neighborhood:"Burlington",city:"Burlington",state:"VT",borough:"Vermont"},
  {name:"Penny Cluse Cafe",category:"Breakfast & Brunch Restaurant",address:"169 Cherry St, Burlington, VT 05401",neighborhood:"Burlington",city:"Burlington",state:"VT",borough:"Vermont"},
  {name:"August First Bakery",category:"Bakery with Cafe Seating",address:"149 S Champlain St, Burlington, VT 05401",neighborhood:"Burlington",city:"Burlington",state:"VT",borough:"Vermont"},

  // PORTLAND, ME
  {name:"Tandem Coffee Roasters",category:"Independent Coffee Shop",address:"742 Congress St, Portland, ME 04102",neighborhood:"Portland ME",city:"Portland",state:"ME",borough:"Maine"},
  {name:"Speckled Ax Coffee",category:"Independent Coffee Shop",address:"567 Congress St, Portland, ME 04101",neighborhood:"Portland ME",city:"Portland",state:"ME",borough:"Maine"},
  {name:"Rosemont Market",category:"Health Food Store",address:"580 Brighton Ave, Portland, ME 04102",neighborhood:"Portland ME",city:"Portland",state:"ME",borough:"Maine"},
  {name:"Portland Food Co-op",category:"Health Food Store",address:"290 Congress St, Portland, ME 04101",neighborhood:"Portland ME",city:"Portland",state:"ME",borough:"Maine"},
  {name:"Duckfat",category:"Farm-to-Table Restaurant",address:"43 Middle St, Portland, ME 04101",neighborhood:"Portland ME",city:"Portland",state:"ME",borough:"Maine"},
  {name:"Fore Street Restaurant",category:"Farm-to-Table Restaurant",address:"288 Fore St, Portland, ME 04101",neighborhood:"Portland ME",city:"Portland",state:"ME",borough:"Maine"},
  {name:"Eventide Oyster Co.",category:"Farm-to-Table Restaurant",address:"86 Middle St, Portland, ME 04101",neighborhood:"Portland ME",city:"Portland",state:"ME",borough:"Maine"},
  {name:"Holy Donut",category:"Bakery with Cafe Seating",address:"194 Park Ave, Portland, ME 04101",neighborhood:"Portland ME",city:"Portland",state:"ME",borough:"Maine"},

  // ANCHORAGE, AK
  {name:"SteamDot Coffee",category:"Independent Coffee Shop",address:"507 W 3rd Ave, Anchorage, AK 99501",neighborhood:"Anchorage",city:"Anchorage",state:"AK",borough:"Alaska"},
  {name:"Kaladi Brothers Coffee",category:"Independent Coffee Shop",address:"621 W 36th Ave, Anchorage, AK 99503",neighborhood:"Anchorage",city:"Anchorage",state:"AK",borough:"Alaska"},
  {name:"Natural Pantry",category:"Health Food Store",address:"3801 Old Seward Hwy, Anchorage, AK 99503",neighborhood:"Anchorage",city:"Anchorage",state:"AK",borough:"Alaska"},
  {name:"New Sagaya City Market",category:"Specialty Food Shop",address:"900 W 13th Ave, Anchorage, AK 99501",neighborhood:"Anchorage",city:"Anchorage",state:"AK",borough:"Alaska"},
  {name:"Snow City Cafe",category:"Breakfast & Brunch Restaurant",address:"1034 W 4th Ave, Anchorage, AK 99501",neighborhood:"Anchorage",city:"Anchorage",state:"AK",borough:"Alaska"},
  {name:"Fire Island Rustic Bakeshop",category:"Bakery with Cafe Seating",address:"1343 G St, Anchorage, AK 99501",neighborhood:"Anchorage",city:"Anchorage",state:"AK",borough:"Alaska"},

  // MILWAUKEE, WI
  {name:"Colectivo Coffee (Lakefront)",category:"Independent Coffee Shop",address:"1701 N Lincoln Memorial Dr, Milwaukee, WI 53202",neighborhood:"Milwaukee",city:"Milwaukee",state:"WI",borough:"Wisconsin"},
  {name:"Outpost Natural Foods",category:"Health Food Store",address:"100 E Capitol Dr, Milwaukee, WI 53212",neighborhood:"Milwaukee",city:"Milwaukee",state:"WI",borough:"Wisconsin"},
  {name:"Beerline Cafe",category:"Independent Coffee Shop",address:"2076 N Commerce St, Milwaukee, WI 53212",neighborhood:"Milwaukee",city:"Milwaukee",state:"WI",borough:"Wisconsin"},
  {name:"Bolzano Artisan Meats",category:"Butcher Shop",address:"800 N Water St, Milwaukee, WI 53202",neighborhood:"Milwaukee",city:"Milwaukee",state:"WI",borough:"Wisconsin"},
  {name:"Braise Restaurant",category:"Farm-to-Table Restaurant",address:"1101 S 2nd St, Milwaukee, WI 53204",neighborhood:"Milwaukee",city:"Milwaukee",state:"WI",borough:"Wisconsin"},
  {name:"Cafe Corazon",category:"Breakfast & Brunch Restaurant",address:"3129 N Bremen St, Milwaukee, WI 53212",neighborhood:"Milwaukee",city:"Milwaukee",state:"WI",borough:"Wisconsin"},

  // MISSOULA, MT
  {name:"Black Coffee Roasting Co.",category:"Independent Coffee Shop",address:"525 N Higgins Ave, Missoula, MT 59802",neighborhood:"Missoula",city:"Missoula",state:"MT",borough:"Montana"},
  {name:"Good Food Store",category:"Health Food Store",address:"1600 S 3rd St W, Missoula, MT 59801",neighborhood:"Missoula",city:"Missoula",state:"MT",borough:"Montana"},
  {name:"Western Montana Growers Co-op",category:"Health Food Store",address:"Missoula, MT 59801",neighborhood:"Missoula",city:"Missoula",state:"MT",borough:"Montana"},
  {name:"The Pearl Cafe",category:"Farm-to-Table Restaurant",address:"231 E Front St, Missoula, MT 59802",neighborhood:"Missoula",city:"Missoula",state:"MT",borough:"Montana"},
  {name:"Catalyst Cafe",category:"Independent Coffee Shop",address:"111 N Higgins Ave, Missoula, MT 59802",neighborhood:"Missoula",city:"Missoula",state:"MT",borough:"Montana"},
];

// Read existing data
const dataPath = path.join(__dirname, 'public', 'all-targets.json');
const existing = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
console.log('Existing leads:', existing.length);

// Add cold-weather leads (all assigned to Danielle via territory override)
const newLeads = COLD_LEADS.map(l => ({
  ...l,
  territory: 'danielle', // Force assign to Danielle
}));

// Deduplicate
const seen = new Set(existing.map(b => (b.name + '|' + b.address).toLowerCase()));
let added = 0;
newLeads.forEach(l => {
  const key = (l.name + '|' + l.address).toLowerCase();
  if (!seen.has(key)) {
    existing.push(l);
    seen.add(key);
    added++;
  }
});

fs.writeFileSync(dataPath, JSON.stringify(existing, null, 2));
console.log('Added:', added, 'cold-weather leads');
console.log('Total:', existing.length);

// Also copy to root for GitHub Pages
fs.copyFileSync(dataPath, path.join(__dirname, 'all-targets.json'));
console.log('Copied to root all-targets.json');
