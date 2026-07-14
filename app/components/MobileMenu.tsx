import {NavLink} from 'react-router';
import {useAside} from '~/components/Aside';
import {useLocalePrefix} from '~/lib/i18n';
import type {HeaderMenuData} from '~/lib/headerMenu';

/**
 * Mobiel menu in de Aside-drawer: collectiegroepen als accordeon
 * (native <details>/<summary>), losse links plat eronder.
 */
export function MobileMenu({menu}: {menu: HeaderMenuData}) {
  const {close} = useAside();
  const localePrefix = useLocalePrefix();

  return (
    <nav className="mobile-menu" role="navigation">
      <NavLink
        className="mobile-menu__link"
        end
        onClick={close}
        prefetch="intent"
        to={`${localePrefix}/`}
      >
        Home
      </NavLink>
      {menu.items.map((item) => {
        if (item.kind === 'link') {
          if (item.external) {
            return (
              <a
                className="mobile-menu__link"
                href={item.to}
                key={item.key}
                onClick={close}
                rel="noopener noreferrer"
                target={item.newWindow ? '_blank' : undefined}
              >
                {item.label}
              </a>
            );
          }
          return (
            <NavLink
              className="mobile-menu__link"
              end
              key={item.key}
              onClick={close}
              prefetch="intent"
              to={`${localePrefix}${item.to}`}
            >
              {item.label}
            </NavLink>
          );
        }

        return (
          <details className="mobile-menu__group" key={item.key}>
            <summary className="mobile-menu__summary">
              {item.title}
              <span aria-hidden="true" className="mobile-menu__icon" />
            </summary>
            <div className="mobile-menu__body">
              {item.links.map((link) => (
                <NavLink
                  key={link.to}
                  onClick={close}
                  prefetch="intent"
                  to={`${localePrefix}${link.to}`}
                >
                  {link.title}
                </NavLink>
              ))}
            </div>
          </details>
        );
      })}
    </nav>
  );
}
