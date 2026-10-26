/**
 * როუტის შეცდომის საზღვარი (ჩატვირთვის ან რენდერის შეცდომა).
 * RootLayout-ის ნაცვლად ჩნდება, ამიტომ საკუთარი `<main>` აქვს.
 */
export default function RouteError() {
  return (
    <main id="main">
      <title>შეცდომა — მეტი ჩართულობა</title>
      <h1>გვერდი ვერ ჩაიტვირთა</h1>
    </main>
  );
}
