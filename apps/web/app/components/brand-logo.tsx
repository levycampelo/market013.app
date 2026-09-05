import Image from "next/image";
import logo from "../../img/logo-market013.jpg";

export default function BrandLogo() {
  return <Image className="brand-logo" src={logo} alt="market013.app" priority />;
}
