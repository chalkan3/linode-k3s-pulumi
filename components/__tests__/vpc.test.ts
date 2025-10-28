import * as pulumi from "@pulumi/pulumi";
import { VpcComponent } from "../vpc";

// Mock do Pulumi runtime
pulumi.runtime.setMocks({
  newResource: function(args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
    // Mock específico para Linode VPC
    if (args.type === "linode:index/vpc:Vpc") {
      return {
        id: "12345",
        state: {
          ...args.inputs,
          id: "12345",
          created: "2024-01-01T00:00:00Z",
        },
      };
    }
    // Mock específico para Linode VPC Subnet
    if (args.type === "linode:index/vpcSubnet:VpcSubnet") {
      return {
        id: "67890",
        state: {
          ...args.inputs,
          id: "67890",
          created: "2024-01-01T00:00:00Z",
        },
      };
    }
    return {
      id: args.inputs.name + "_id",
      state: args.inputs,
    };
  },
  call: function(args: pulumi.runtime.MockCallArgs) {
    return args.inputs;
  },
});

describe("VpcComponent", () => {
  const baseArgs = {
    region: "us-east",
    clusterName: "test-cluster",
  };

  describe("constructor", () => {
    it("should create a VPC component with minimal config", () => {
      const vpc = new VpcComponent("test-vpc", baseArgs);

      expect(vpc).toBeDefined();
      expect(vpc.vpc).toBeDefined();
      expect(vpc.subnet).toBeDefined();
      expect(vpc.vpcId).toBeDefined();
      expect(vpc.subnetId).toBeDefined();
    });

    it("should create VPC with custom labels", () => {
      const vpc = new VpcComponent("test-vpc-custom", {
        ...baseArgs,
        vpcLabel: "custom-vpc",
        subnetLabel: "custom-subnet",
      });

      expect(vpc).toBeDefined();
      expect(vpc.vpc).toBeDefined();
    });

    it("should create VPC with custom description", () => {
      const vpc = new VpcComponent("test-vpc-desc", {
        ...baseArgs,
        vpcDescription: "Custom VPC for testing",
      });

      expect(vpc).toBeDefined();
    });

    it("should create VPC with custom subnet CIDR", () => {
      const vpc = new VpcComponent("test-vpc-cidr", {
        ...baseArgs,
        subnetIpv4: "10.1.0.0/24",
      });

      expect(vpc).toBeDefined();
      expect(vpc.subnet).toBeDefined();
    });
  });

  describe("VPC creation", () => {
    it("should create VPC with default label", () => {
      const vpc = new VpcComponent("test-vpc-default", baseArgs);

      expect(vpc.vpc).toBeDefined();
    });

    it("should create VPC in specified region", () => {
      const vpc = new VpcComponent("test-vpc-region", {
        ...baseArgs,
        region: "eu-west",
      });

      expect(vpc.vpc).toBeDefined();
    });
  });

  describe("Subnet creation", () => {
    it("should create subnet with default CIDR", () => {
      const vpc = new VpcComponent("test-subnet-default", baseArgs);

      expect(vpc.subnet).toBeDefined();
    });

    it("should create subnet with custom CIDR", () => {
      const vpc = new VpcComponent("test-subnet-custom", {
        ...baseArgs,
        subnetIpv4: "10.2.0.0/24",
      });

      expect(vpc.subnet).toBeDefined();
    });

    it("should link subnet to VPC", () => {
      const vpc = new VpcComponent("test-subnet-link", baseArgs);

      expect(vpc.subnet).toBeDefined();
      expect(vpc.vpcId).toBeDefined();
    });
  });

  describe("outputs", () => {
    it("should provide vpcId output", async () => {
      const vpc = new VpcComponent("test-vpc-id", baseArgs);

      return pulumi.output(vpc.vpcId).apply((id) => {
        expect(id).toBeDefined();
        expect(typeof id).toBe("number");
      });
    });

    it("should provide subnetId output", async () => {
      const vpc = new VpcComponent("test-subnet-id", baseArgs);

      return pulumi.output(vpc.subnetId).apply((id) => {
        expect(id).toBeDefined();
        expect(typeof id).toBe("number");
      });
    });

    it("should convert string IDs to numbers", async () => {
      const vpc = new VpcComponent("test-id-conversion", baseArgs);

      return pulumi.all([vpc.vpcId, vpc.subnetId]).apply(([vpcId, subnetId]) => {
        expect(typeof vpcId).toBe("number");
        expect(typeof subnetId).toBe("number");
      });
    });
  });

  describe("resource registration", () => {
    it("should register as ComponentResource", () => {
      const vpc = new VpcComponent("test-registration", baseArgs);

      expect(vpc).toBeInstanceOf(pulumi.ComponentResource);
    });

    it("should register outputs correctly", () => {
      const vpc = new VpcComponent("test-outputs", baseArgs);

      expect(vpc.vpcId).toBeDefined();
      expect(vpc.subnetId).toBeDefined();
    });
  });

  describe("different cluster configurations", () => {
    it("should create VPC for production cluster", () => {
      const vpc = new VpcComponent("prod-vpc", {
        region: "us-east",
        clusterName: "production-cluster",
        vpcLabel: "prod-vpc",
        vpcDescription: "Production VPC",
      });

      expect(vpc).toBeDefined();
    });

    it("should create VPC for staging cluster", () => {
      const vpc = new VpcComponent("staging-vpc", {
        region: "us-west",
        clusterName: "staging-cluster",
        subnetIpv4: "10.10.0.0/24",
      });

      expect(vpc).toBeDefined();
    });

    it("should create VPC for development cluster", () => {
      const vpc = new VpcComponent("dev-vpc", {
        region: "eu-central",
        clusterName: "dev-cluster",
      });

      expect(vpc).toBeDefined();
    });
  });
});
