import { Version, CHANNEL_RANK, UPDATE_CHANNELS, releaseUrl } from "./types";

describe("Update common types", () => {
  describe("Version", () => {
    it("should create a version and stringify it", () => {
      const v = new Version(1, 2, 3);
      expect(v.toString()).toBe("1.2.3-stable");
      expect(v.major).toBe(1);
      expect(v.minor).toBe(2);
      expect(v.patch).toBe(3);
      expect(v.channel).toBe("stable");
      expect(v.build).toBe(0);
    });

    it("should honor a custom channel and build", () => {
      const v = new Version(2, 0, 0, "beta", 7);
      expect(v.toString()).toBe("2.0.0-beta");
      expect(v.build).toBe(7);
    });

    it("should parse a plain version", () => {
      const v = Version.parse("1.2.3");
      expect(v).not.toBeNull();
      expect(v?.toString()).toBe("1.2.3-stable");
    });

    it("should parse a leading v and a channel suffix", () => {
      const v = Version.parse("v2.4.6-beta");
      expect(v?.major).toBe(2);
      expect(v?.minor).toBe(4);
      expect(v?.patch).toBe(6);
      expect(v?.channel).toBe("beta");
    });

    it("should parse a nightly channel", () => {
      const v = Version.parse("3.1.0-nightly");
      expect(v?.channel).toBe("nightly");
    });

    it("should reject an unknown channel suffix", () => {
      expect(Version.parse("1.2.3-rc")).toBeNull();
    });

    it("should reject malformed inputs", () => {
      expect(Version.parse("abc")).toBeNull();
      expect(Version.parse("")).toBeNull();
      expect(Version.parse("1.2")).toBeNull();
      expect(Version.parse("1.x.3")).toBeNull();
      expect(Version.parse("   ")).toBeNull();
    });

    it("should compare by major, minor, patch then channel", () => {
      expect(Version.compare(new Version(1, 0, 0), new Version(2, 0, 0))).toBeLessThan(0);
      expect(Version.compare(new Version(2, 0, 0), new Version(1, 9, 9))).toBeGreaterThan(0);
      expect(Version.compare(new Version(1, 2, 0), new Version(1, 2, 3))).toBeLessThan(0);
      expect(Version.compare(new Version(1, 2, 3, "stable"), new Version(1, 2, 3, "beta"))).toBeLessThan(0);
      expect(Version.compare(new Version(1, 2, 3), new Version(1, 2, 3))).toBe(0);
    });

    it("should detect equal cores", () => {
      expect(Version.sameCore(new Version(1, 2, 3, "stable"), new Version(1, 2, 3, "beta"))).toBe(true);
      expect(Version.sameCore(new Version(1, 2, 3), new Version(1, 2, 4))).toBe(false);
    });

    it("should detect newer versions", () => {
      expect(Version.isNewer(new Version(1, 2, 3), new Version(1, 0, 0))).toBe(true);
      expect(Version.isNewer(new Version(1, 0, 0), new Version(1, 2, 3))).toBe(false);
      expect(Version.isNewer(new Version(1, 2, 3), new Version(1, 2, 3))).toBe(false);
      expect(Version.isNewer(new Version(1, 2, 3, "beta"), new Version(1, 2, 3, "stable"))).toBe(false);
    });

    it("should check minimum requirements", () => {
      const current = new Version(1, 2, 0);
      expect(current.satisfiesMinimum(new Version(1, 0, 0))).toBe(true);
      expect(current.satisfiesMinimum(new Version(1, 2, 0))).toBe(true);
      expect(current.satisfiesMinimum(new Version(1, 3, 0))).toBe(false);
      expect(new Version(1, 2, 3, "stable").satisfiesMinimum(new Version(1, 2, 3, "beta"))).toBe(true);
    });
  });

  describe("channels and URLs", () => {
    it("should rank channels in order", () => {
      expect(CHANNEL_RANK.stable).toBe(0);
      expect(CHANNEL_RANK.beta).toBe(1);
      expect(CHANNEL_RANK.nightly).toBe(2);
    });

    it("should list all channels", () => {
      expect(UPDATE_CHANNELS).toEqual(["stable", "beta", "nightly"]);
    });

    it("should build a release URL", () => {
      expect(releaseUrl("owner", "repo")).toBe("https://api.github.com/repos/owner/repo/releases/latest");
    });
  });
});
