import {Link} from 'react-router';

type VipSaleGateProps = {
  loginUrl: string;
};

export function VipSaleGate({loginUrl}: VipSaleGateProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="max-w-2xl font-heading text-[32px] font-normal leading-[normal] text-black sm:text-[40px]">
        VIP-sale
      </h1>
      <p className="max-w-xl font-body text-[16px] leading-relaxed text-black/70">
        De VIP-sale staat vol met items die al zijn afgeprijsd. Log in met je
        VIP-account en krijg daar bovenop nog eens extra korting op je hele
        bestelling, automatisch verrekend bij het afrekenen.
      </p>
      <div className="pt-2">
        <Link
          className="inline-flex w-fit items-center bg-terracotta px-6 py-3 font-body text-[18px] font-normal leading-[normal] text-white underline hover:underline"
          to={loginUrl}
        >
          Inloggen
        </Link>
      </div>
    </div>
  );
}

export default VipSaleGate;
