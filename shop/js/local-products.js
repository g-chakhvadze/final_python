/* =========================================================
   local-products.js — ლოკალური კატალოგი: პროცესორები და ვიდეოდაფები
   -----------------------------------------------------------
   იგივე ფორმატი აქვს, რაც EverREST API-ის ნივთებს, ამიტომ ბარათები,
   დეტალური გვერდი და კალათა ერთნაირად მუშაობს ორივე წყაროსთან.
   ფასები და მარაგი სადემონსტრაციოა.
   ========================================================= */

const LOCAL_CATEGORIES = [
  { id: 'cpu', name: 'პროცესორები', image: 'img/products/r7-7800x3d.svg' },
  { id: 'gpu', name: 'ვიდეოდაფები', image: 'img/products/rtx4070s-msi.svg' },
];

/* [id, title, brand, categoryId, price, beforeDiscount, stock, rating, image,
    warranty, issueDate, description, [[reviewer, value, text, daysAgo], …]] */
const LOCAL_RAW = [
  /* ---------------- პროცესორები ---------------- */
  ['r7-7800x3d', 'AMD Ryzen 7 7800X3D', 'AMD', 'cpu', 389, 449, 14, 4.8, 'cpu-amd', '3 წელი', '2023-04-06',
    '8 ბირთვი / 16 ნაკადი, 3D V-Cache ტექნოლოგია და 104 MB საერთო ქეში. თამაშებისთვის დღესდღეობით ერთ-ერთი ყველაზე ეფექტური პროცესორი AM5 სოკეტზე, TDP სულ რაღაც 120 ვატი.',
    [['გიორგი კაპანაძე', 5, 'თამაშებში უბრალოდ ურჩხულია, 1% low მაჩვენებლები ძალიან სტაბილურია.', 12],
     ['ნინო ბერიძე', 5, 'ცივი და ჩუმია, 7700X-თან შედარებით განსხვავება აშკარაა.', 34],
     ['Data Center', 4, 'რენდერში უფრო მეტბირთვიანი მოდელი ჯობია, თამაშებში კი — საუკეთესო.', 61]]],

  ['r5-7600x', 'AMD Ryzen 5 7600X', 'AMD', 'cpu', 219, 0, 26, 4.6, 'cpu-amd', '3 წელი', '2022-09-27',
    '6 ბირთვი / 12 ნაკადი, ბუსტი 5.3 GHz-მდე. შესანიშნავი არჩევანი საშუალო ფასის თამაშების კომპიუტერისთვის, PCIe 5.0 და DDR5 მხარდაჭერით.',
    [['ლევან ჩხეიძე', 5, 'ფასი/ხარისხით საუკეთესოა, 1440p-ზე ვიდეოდაფას სრულად ტვირთავს.', 8],
     ['Mamuka G.', 4, 'კარგია, მაგრამ ნორმალური ქულერი აუცილებლად დასჭირდება.', 45]]],

  ['r9-7950x', 'AMD Ryzen 9 7950X', 'AMD', 'cpu', 549, 599, 8, 4.7, 'cpu-amd', '3 წელი', '2022-09-27',
    '16 ბირთვი / 32 ნაკადი, 80 MB ქეში, ბუსტი 5.7 GHz-მდე. მძიმე სამუშაო დატვირთვისთვის: 3D რენდერი, ვიდეომონტაჟი, კომპილაცია და ვირტუალიზაცია.',
    [['Studio Arch', 5, 'Blender-ში რენდერის დრო თითქმის განახევრდა.', 19],
     ['ანა მელაძე', 4, 'წარმადობა ფანტასტიკურია, მაგრამ გაგრილებას სერიოზულად უნდა მიხედო.', 52]]],

  ['r5-5600', 'AMD Ryzen 5 5600', 'AMD', 'cpu', 119, 149, 31, 4.5, 'cpu-amd', '2 წელი', '2022-04-04',
    '6 ბირთვი / 12 ნაკადი AM4 პლატფორმისთვის. იდეალური არჩევანი ბიუჯეტური აწყობისთვის ან ძველი AM4 სისტემის განახლებისთვის — ძვირადღირებული DDR5 და ახალი დედაპლატა არ სჭირდება.',
    [['Beka P.', 5, 'ძველ B450-ზე დავაყენე, BIOS-ის განახლების შემდეგ ყველაფერი მუშაობს.', 23],
     ['თამარ ჯანაშია', 4, 'ამ ფასად კონკურენცია პრაქტიკულად არ აქვს.', 70]]],

  ['i5-14600k', 'Intel Core i5-14600K', 'Intel', 'cpu', 279, 319, 18, 4.5, 'cpu-intel', '3 წელი', '2023-10-17',
    '14 ბირთვი (6P + 8E) / 20 ნაკადი, ბუსტი 5.3 GHz-მდე. დაბლოკილი მამრავლი ოვერკლოკინგისთვის და ჩაშენებული გრაფიკა UHD 770.',
    [['Nika R.', 5, 'სტრიმინგი და თამაში ერთდროულად — პრობლემის გარეშე.', 15],
     ['გიორგი ხარაიშვილი', 4, 'კარგი პროცესორია, მაგრამ ენერგომოხმარება მაღალია.', 40]]],

  ['i7-14700k', 'Intel Core i7-14700K', 'Intel', 'cpu', 389, 0, 12, 4.6, 'cpu-intel', '3 წელი', '2023-10-17',
    '20 ბირთვი (8P + 12E) / 28 ნაკადი, 33 MB L3 ქეში. ძლიერი ჰიბრიდი თამაშებისა და პროფესიული სამუშაოსთვის LGA1700 სოკეტზე.',
    [['Vato K.', 5, 'მონტაჟში E-ბირთვები ძალიან კარგად ეხმარება.', 11]]],

  ['i9-14900k', 'Intel Core i9-14900K', 'Intel', 'cpu', 549, 0, 6, 4.3, 'cpu-intel', '3 წელი', '2023-10-17',
    '24 ბირთვი (8P + 16E) / 32 ნაკადი და ბუსტი 6.0 GHz-მდე. მაქსიმალური წარმადობა, თუმცა საჭიროებს ძლიერ გაგრილებას და ხარისხიან კვების ბლოკს.',
    [['Overclock.ge', 4, 'სიჩქარე შთამბეჭდავია, მაგრამ 360 მმ AIO აუცილებელია.', 27],
     ['სანდრო', 4, 'ცხელა, მაგრამ წარმადობა თავის ფასს ამართლებს.', 55]]],

  ['i3-14100f', 'Intel Core i3-14100F', 'Intel', 'cpu', 109, 0, 37, 4.2, 'cpu-intel', '3 წელი', '2024-01-08',
    '4 ბირთვი / 8 ნაკადი, ბუსტი 4.7 GHz-მდე, ჩაშენებული გრაფიკის გარეშე. ბიუჯეტური აწყობისთვის, სადაც ცალკე ვიდეოდაფა ისედაც იგეგმება.',
    [['Student Build', 4, 'საოფისე და E-Sports თამაშებისთვის სრულიად საკმარისია.', 9]]],

  /* ---------------- ვიდეოდაფები ---------------- */
  ['rtx4060-asus', 'ASUS Dual GeForce RTX 4060 OC 8GB', 'ASUS', 'gpu', 309, 339, 21, 4.3, 'gpu-blue', '3 წელი', '2023-06-29',
    '8 GB GDDR6, 128-ბიტიანი შინა, DLSS 3 მხარდაჭერა. კომპაქტური ორქულერიანი დიზაინი და მხოლოდ 115 ვატი — იდეალურია 1080p თამაშებისთვის.',
    [['Luka T.', 4, 'ჩუმია და ცივი, 1080p-ზე ყველაფერს ულტრაზე ექაჩება.', 14],
     ['ირაკლი', 4, '8 GB ვიდეომეხსიერება ზოგ ახალ თამაშში უკვე ზღვარზეა.', 38]]],

  ['rtx4070s-msi', 'MSI GeForce RTX 4070 SUPER Ventus 3X 12GB', 'MSI', 'gpu', 619, 669, 9, 4.7, 'gpu-green', '3 წელი', '2024-01-17',
    '12 GB GDDR6X, 7168 CUDA ბირთვი და სამქულერიანი Ventus 3X გაგრილება. საუკეთესო არჩევანი 1440p თამაშებისთვის მაღალი კადრების სიხშირით.',
    [['Giorgi M.', 5, '1440p ულტრა + Ray Tracing — სტაბილური 100+ FPS.', 6],
     ['PC Lab', 5, 'ტემპერატურა დატვირთვის დროსაც კი 65°C-ს არ სცდება.', 21],
     ['Nino K.', 4, 'კარგია, მაგრამ კორპუსში ადგილი გაზომე — დიდია.', 44]]],

  ['rtx4080s-gb', 'Gigabyte GeForce RTX 4080 SUPER Gaming OC 16GB', 'Gigabyte', 'gpu', 1049, 1129, 4, 4.8, 'gpu-green', '4 წელი', '2024-01-31',
    '16 GB GDDR6X, 10240 CUDA ბირთვი. 4K თამაშებისა და პროფესიული რენდერისთვის — DLSS 3 და AV1 კოდირების მხარდაჭერით.',
    [['Render Farm', 5, '4K-ზე ულტრა პარამეტრები ყოველგვარი კომპრომისის გარეშე.', 17],
     ['Dato', 5, 'ძვირია, მაგრამ წლების განმავლობაში აღარაფერი დაგჭირდება.', 48]]],

  ['rtx4070tis-zotac', 'Zotac GeForce RTX 4070 Ti SUPER Trinity 16GB', 'Zotac', 'gpu', 819, 0, 7, 4.6, 'gpu-blue', '3 წელი', '2024-01-24',
    '16 GB GDDR6X და 256-ბიტიანი შინა. ოქროს შუალედი 4070 SUPER-სა და 4080-ს შორის — თამაშებისთვისაც და 3D სამუშაოსთვისაც.',
    [['Saba L.', 5, '16 GB მეხსიერება მომავლისთვის კარგი დაზღვევაა.', 13]]],

  ['rx7800xt-sapphire', 'Sapphire PULSE Radeon RX 7800 XT 16GB', 'Sapphire', 'gpu', 489, 529, 11, 4.6, 'gpu-red', '2 წელი', '2023-09-06',
    '16 GB GDDR6, RDNA 3 არქიტექტურა. 1440p თამაშებში RTX 4070-ის დონის წარმადობა, მეტი ვიდეომეხსიერება და მიმზიდველი ფასი.',
    [['Zura B.', 5, 'რასტერიზაციაში ფასისთვის უბადლოა.', 10],
     ['Mariam', 4, 'დრაივერები უკვე სტაბილურია, Ray Tracing კი ოდნავ სუსტია.', 36]]],

  ['rx7900xtx-asus', 'ASUS TUF Radeon RX 7900 XTX 24GB', 'ASUS', 'gpu', 949, 999, 5, 4.7, 'gpu-red', '3 წელი', '2022-12-13',
    '24 GB GDDR6 — ყველაზე დიდი ვიდეომეხსიერება ამ კლასში. 4K თამაშებისთვის და დიდი ტექსტურებით მუშაობისთვის, გამძლე TUF გაგრილებით.',
    [['Workstation.ge', 5, '24 GB მეხსიერება ლოკალური ნეირონული მოდელებისთვისაც კმარა.', 25]]],

  ['rx7600-msi', 'MSI Radeon RX 7600 8GB', 'MSI', 'gpu', 259, 289, 17, 4.1, 'gpu-red', '2 წელი', '2023-05-25',
    '8 GB GDDR6 ბიუჯეტური 1080p თამაშებისთვის. დაბალი ენერგომოხმარება (165 ვატი) და კომპაქტური ზომა მცირე კორპუსებისთვის.',
    [['Beqa', 4, 'ფასად ძნელად სანახავი კონკურენტი ჰყავს 1080p სეგმენტში.', 20]]],

  ['rtx3050-gb', 'Gigabyte GeForce RTX 3050 6GB', 'Gigabyte', 'gpu', 179, 0, 24, 4.0, 'gpu-blue', '2 წელი', '2024-02-02',
    '6 GB GDDR6, მხოლოდ 70 ვატი და დამატებითი კვების კაბელის გარეშე მუშაობის შესაძლებლობა. კარგი არჩევანი საოფისე კომპიუტერის თამაშებისთვის გადასაკეთებლად.',
    [['Office Build', 4, 'ძველ ოფისურ კომპიუტერში ჩავსვი — კვების ბლოკის შეცვლაც არ დამჭირდა.', 7]]],
];

/* ---------- ობიექტების აგება ---------- */
const LOCAL_PRODUCTS = LOCAL_RAW.map(
  ([id, title, brand, cat, price, before, stock, rating, img, warranty, issueDate, description, reviews]) => {
    const beforeDiscount = before || price;
    const category = LOCAL_CATEGORIES.find((c) => c.id === cat);
    return {
      _id: 'local-' + id,
      title,
      brand,
      description,
      issueDate: new Date(issueDate).toISOString(),
      /* სტუდიური რენდერები: მთავარი ხედი + მეორე ხედი (უკანა მხარე) */
      thumbnail: `img/products/${id}.svg`,
      images: [`img/products/${id}.svg`, `img/products/${id}-b.svg`],
      icon: `img/parts/${img}.svg`,
      stock,
      rating,
      warranty,
      price: {
        current: price,
        currency: 'USD',
        beforeDiscount,
        discountPercentage: beforeDiscount > price ? Math.round(((beforeDiscount - price) / beforeDiscount) * 100) : 0,
      },
      category: { id: category.id, name: category.name, image: category.image },
      ratings: (reviews || []).map(([name, value, text, daysAgo], i) => ({
        userId: `seed-${id}-${i}`,
        name,
        text,
        value,
        createdAt: new Date(Date.now() - daysAgo * 864e5).toISOString(),
      })),
    };
  }
);

/* =========================================================
   მომხმარებლის შეფასებები ლოკალურ ნივთებზე (localStorage)
   ========================================================= */
const LocalRatings = {
  _key: 'er_local_ratings',
  _all() {
    try {
      return JSON.parse(localStorage.getItem(this._key) || '{}');
    } catch {
      return {};
    }
  },
  for(productId) {
    return this._all()[productId] || [];
  },
  add(productId, entry) {
    const all = this._all();
    const list = (all[productId] || []).filter((r) => r.userId !== entry.userId);
    list.push(entry);
    all[productId] = list;
    localStorage.setItem(this._key, JSON.stringify(all));
  },
};

/* =========================================================
   LocalCatalog — API-ის მსგავსი ინტერფეისი ლოკალურ მონაცემებზე
   ========================================================= */
const LocalCatalog = {
  isLocalId(id) {
    return typeof id === 'string' && id.startsWith('local-');
  },

  /** კატეგორიები ნივთების რაოდენობით */
  categories() {
    return LOCAL_CATEGORIES.map((c) => ({
      ...c,
      count: LOCAL_PRODUCTS.filter((p) => p.category.id === c.id).length,
    }));
  },

  /**
   * ბრენდები. თუ კატეგორიაა არჩეული, ბრუნდება მხოლოდ იმ ბრენდები, რომლებსაც
   * ამ კატეგორიაში ნამდვილად აქვთ ნივთი (მაგ. პროცესორებში — მხოლოდ AMD და Intel).
   */
  brands(categoryId = '') {
    const list = categoryId
      ? LOCAL_PRODUCTS.filter((p) => p.category.id === categoryId)
      : LOCAL_PRODUCTS;
    const counts = new Map();
    list.forEach((p) => counts.set(p.brand, (counts.get(p.brand) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  },

  /** ნივთი შერწყმული მომხმარებლის შეფასებებთან */
  byId(id) {
    const base = LOCAL_PRODUCTS.find((p) => p._id === id);
    if (!base) return null;
    const extra = LocalRatings.for(id);
    const ratings = [...base.ratings, ...extra];
    const avg = ratings.length
      ? ratings.reduce((s, r) => s + Number(r.value || 0), 0) / ratings.length
      : base.rating;
    return { ...base, ratings, rating: Math.round(avg * 10) / 10 };
  },

  /** იგივე პარამეტრები, რაც /shop/products/search-ს */
  query({
    keywords = '',
    category_id = '',
    brand = '',
    rating = '',
    price_min = '',
    price_max = '',
    sort_by = '',
    sort_direction = 'asc',
    page_index = 0,
    page_size = 12,
  } = {}) {
    let list = LOCAL_PRODUCTS.map((p) => this.byId(p._id));

    if (keywords) {
      const k = keywords.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(k) ||
          p.brand.toLowerCase().includes(k) ||
          p.description.toLowerCase().includes(k)
      );
    }
    if (category_id) list = list.filter((p) => p.category.id === category_id);
    if (brand) list = list.filter((p) => p.brand === brand);
    if (rating) list = list.filter((p) => p.rating >= Number(rating));
    if (price_min !== '' && price_min !== undefined) list = list.filter((p) => p.price.current >= Number(price_min));
    if (price_max !== '' && price_max !== undefined) list = list.filter((p) => p.price.current <= Number(price_max));

    if (sort_by) {
      const dir = sort_direction === 'desc' ? -1 : 1;
      const value = (p) =>
        ({ price: p.price.current, rating: p.rating, title: p.title.toLowerCase() }[sort_by] ?? 0);
      list.sort((a, b) => (value(a) > value(b) ? dir : value(a) < value(b) ? -dir : 0));
    }

    const total = list.length;
    const skip = page_index * page_size;
    return { total, limit: page_size, page: page_index, skip, products: list.slice(skip, skip + page_size) };
  },

  /** ლოკალური ნივთის შეფასება — API-ის /rate-ის ანალოგი */
  rate(productId, value, user) {
    LocalRatings.add(productId, {
      userId: user?._id || 'local-you',
      name: user ? [user.firstName, user.lastName].filter(Boolean).join(' ') || 'თქვენ' : 'თქვენ',
      value: Number(value),
      createdAt: new Date().toISOString(),
    });
    return this.byId(productId);
  },
};
