import type {ReactNode} from 'react';

type ContentPageProps = {
  title: string;
  html: string;
  /** Optional back-link or other content above the title */
  beforeTitle?: ReactNode;
  /** Optional meta row under the title (date, author, etc.) */
  meta?: ReactNode;
  /** Optional media between header and body (e.g. featured image) */
  media?: ReactNode;
  className?: string;
};

export function ContentPage({
  title,
  html,
  beforeTitle,
  meta,
  media,
  className,
}: ContentPageProps) {
  const rootClass = className ? `content-page ${className}` : 'content-page';

  return (
    <article className={rootClass}>
      <header className="content-page__header">
        {beforeTitle ? (
          <div className="content-page__before">{beforeTitle}</div>
        ) : null}
        <h1 className="content-page__title">{title}</h1>
        {meta ? <div className="content-page__meta">{meta}</div> : null}
      </header>
      {media ? <div className="content-page__media">{media}</div> : null}
      <div
        className="content-page__body"
        dangerouslySetInnerHTML={{__html: html}}
      />
    </article>
  );
}
