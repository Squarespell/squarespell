import { Masthead, Footer } from '@/components/Chrome';

export default function NotFound() {
  return (
    <div className="frame">
      <Masthead />
      <main className="entry">
        <h1 style={{ fontSize: 34 }}>We could not find that report</h1>
        <p className="entry-lede">
          Shared reports are kept indefinitely, but the link may be mistyped or the report may have been
          removed at the owner’s request.
        </p>
        <a href="/">
          <button className="btn btn-lg">Run a new audit</button>
        </a>
      </main>
      <Footer />
    </div>
  );
}
